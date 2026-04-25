// src/services/urlParser.js
export const extractUrls = (text) => {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  const urls = text.match(urlRegex) || [];

  // Filter out common non-job URLs
  const jobKeywords = ['job', 'career', 'apply', 'position', 'opening', 'hiring', 'internship'];
  return [...new Set(urls)].filter((url) => {
    const lower = url.toLowerCase();
    return (
      jobKeywords.some((kw) => lower.includes(kw)) ||
      ['linkedin.com', 'indeed.com', 'glassdoor.com', 'ziprecruiter.com', 'workday.com'].some(
        (domain) => lower.includes(domain)
      )
    );
  });
};

export const detectPlatform = (url) => {
  const lower = url.toLowerCase();
  if (lower.includes('linkedin')) return 'LinkedIn';
  if (lower.includes('indeed')) return 'Indeed';
  if (lower.includes('glassdoor')) return 'Glassdoor';
  if (lower.includes('ziprecruiter')) return 'ZipRecruiter';
  if (lower.includes('workday')) return 'Workday';
  if (lower.includes('google')) return 'Google Jobs';
  return 'Direct';
};
