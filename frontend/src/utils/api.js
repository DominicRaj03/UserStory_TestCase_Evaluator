export const fetchWithRetry = async (url, options = {}, retries = 5, delay = 8000, onRetry = null) => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      // Render free tier often returns 502/503 when spinning up
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new Error(`Server is starting up (Status: ${res.status})`);
      }
      return res; // Success or other expected status codes
    } catch (err) {
      if (i === retries - 1) {
        throw err; // Re-throw the error on the last attempt
      }
      if (onRetry) {
        onRetry(retries - i - 1); // Notify UI about retry attempt
      }
      // Wait before the next retry
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};
