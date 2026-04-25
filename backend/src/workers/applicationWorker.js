// src/workers/applicationWorker.js
import { Worker } from 'bullmq';
import { spawn } from 'child_process';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import crypto from 'crypto';
import { supabase } from '../lib/supabase.js';
import { createLogger } from '../lib/logger.js';
import { decryptKey } from '../lib/crypto.js';

const logger = createLogger('worker');

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Parse Redis connection from REDIS_URL
const getRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password || undefined,
        username: url.username || undefined,
        ...(url.protocol === 'rediss:' && { tls: {} }),
      };
    } catch (e) {
      logger.warn(`Failed to parse REDIS_URL: ${e.message}`);
    }
  }
  return { host: '127.0.0.1', port: 6379 };
};

// ── Process a single application ────────────────────────────────
const processApplication = async (job) => {
  const { applicationId, jobUrl, userId } = job.data;
  logger.info(`Processing job ${job.id}: application=${applicationId} url=${jobUrl}`);

  // Step A — Mark as processing
  await supabase
    .from('applications')
    .update({ status: 'processing' })
    .eq('id', applicationId);

  // Step B — Retrieve resume data
  const { data: resume } = await supabase
    .from('resume_data')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!resume) {
    throw new Error('No resume data found — please fill out your profile first');
  }

  // Step C — Retrieve & decrypt active API keys
  const { data: keys } = await supabase
    .from('api_keys')
    .select('key_name, encrypted_value')
    .eq('user_id', userId)
    .eq('is_active', true);

  const decryptedKeys = {};
  for (const key of keys || []) {
    try {
      decryptedKeys[key.key_name] = decryptKey(key.encrypted_value);
    } catch (err) {
      logger.warn(`Failed to decrypt key "${key.key_name}": ${err.message}`);
    }
  }

  // Step D — Write temp files (profile.json + resume.txt)
  const tempDir = join(tmpdir(), `applypilot-${crypto.randomUUID()}`);
  await mkdir(tempDir, { recursive: true });

  const profileJson = {
    full_name: resume.full_name,
    email: resume.email,
    phone: resume.phone,
    location: resume.location,
    linkedin_url: resume.linkedin_url,
    github_url: resume.github_url,
    portfolio_url: resume.portfolio_url,
    education: resume.education,
    experience: resume.experience,
    skills: resume.skills,
    // Inject API keys ApplyPilot needs
    gemini_api_key: decryptedKeys.gemini_api_key || process.env.GEMINI_API_KEY || '',
    capsolver_api_key: decryptedKeys.capsolver_api_key || process.env.CAPSOLVER_API_KEY || '',
  };

  const profilePath = join(tempDir, 'profile.json');
  const resumePath = join(tempDir, 'resume.txt');

  await writeFile(profilePath, JSON.stringify(profileJson, null, 2));
  await writeFile(resumePath, resume.resume_text || '');

  // Step E — Spawn ApplyPilot
  const bin = process.env.APPLYPILOT_BIN || 'applypilot';
  let stdout = '';
  let stderr = '';

  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(bin, ['apply', '--url', jobUrl, '--profile', profilePath, '--resume', resumePath], {
        cwd: tempDir,
        env: {
          ...process.env,
          GEMINI_API_KEY: profileJson.gemini_api_key,
          CAPSOLVER_API_KEY: profileJson.capsolver_api_key,
        },
        timeout: TIMEOUT_MS,
      });

      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.stderr.on('data', (data) => { stderr += data.toString(); });

      child.on('close', (code) => {
        if (code === 0) resolve({ code, stdout, stderr });
        else reject(new Error(`ApplyPilot exited with code ${code}`));
      });

      child.on('error', (err) => reject(err));

      // Enforce timeout
      setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error('ApplyPilot timed out after 5 minutes'));
      }, TIMEOUT_MS);
    });

    // Step G — Update status to success
    const output = {
      stdout: stdout.substring(0, 5000), // Trim to 5k chars
      stderr: stderr.substring(0, 2000),
      exit_code: result.code,
    };

    await supabase
      .from('applications')
      .update({
        status: 'success',
        applied_at: new Date().toISOString(),
        applypilot_output: output,
        error_message: null,
      })
      .eq('id', applicationId);

    logger.info(`Application ${applicationId} completed successfully`);
    return output;

  } catch (err) {
    // Step H — Update status to failed
    const output = {
      stdout: stdout.substring(0, 5000),
      stderr: stderr.substring(0, 2000),
      error: err.message,
    };

    await supabase
      .from('applications')
      .update({
        status: 'failed',
        error_message: err.message.substring(0, 500),
        applypilot_output: output,
      })
      .eq('id', applicationId);

    logger.error(`Application ${applicationId} failed: ${err.message}`);
    throw err; // Re-throw so BullMQ registers the failure

  } finally {
    // Step F — Cleanup temp folder
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      logger.warn(`Failed to cleanup temp dir ${tempDir}: ${cleanupErr.message}`);
    }
  }
};

// ── Start the worker ────────────────────────────────────────────
let worker = null;

try {
  const connection = getRedisConnection();

  worker = new Worker('applications', processApplication, {
    connection,
    concurrency: 2, // Process 2 jobs at a time
    limiter: {
      max: 5,
      duration: 60000, // Max 5 jobs per minute (rate limit)
    },
  });

  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed: ${err.message}`);
  });

  worker.on('error', (err) => {
    if (err.message?.includes('ECONNREFUSED') || err.message?.includes('ENOTFOUND')) {
      logger.warn('Worker: Redis not available — will retry when connected');
    } else {
      logger.error(`Worker error: ${err.message}`);
    }
  });

  logger.info('Application worker started (concurrency: 2)');
} catch (err) {
  logger.warn(`Worker could not start: ${err.message} — queue processing disabled`);
}

export { worker };
