import fs from 'fs/promises';
import axios from 'axios';
import pLimit from 'p-limit';
import pkgHttps from 'https-proxy-agent';
const { HttpsProxyAgent } = pkgHttps;

// ------------------- Config -------------------
const THREADS = 10;
const API_KEY_2CAPTCHA = "your-2captcha-key";

const TURNSTILE_SITE_KEY = "0x4AAAAAAAkhmGkb2VS6MRU0";
const PAGE_URL = "https://dashboard.teneo.pro/";
const X_API = "OwAG3kib1ivOJG4Y0OCZ8lJETa6ypvsDtGmdhcjB";
const LOGIN_URL = "https://auth.teneo.pro/api/login";

const ACCOUNTS_FILE = "accounts.txt";
const TOKENS_FILE = "tokens.txt";
const PROXIES_FILE = "proxies.txt";
const FAILED_FILE = "failed.txt";

let proxiesList = [];
let proxyIndex = 0;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readAccounts(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const lines = data
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    return lines.map(line => {
      const [email, password] = line.split('|');
      return { email, password };
    });
  } catch (err) {
    throw new Error(`Error reading accounts file: ${err.message}`);
  }
}

async function loadProxies(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const lines = data
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    return lines;
  } catch (err) {
    console.error(`Error reading proxies file: ${err.message}`);
    return [];
  }
}

function getNextProxy() {
  if (proxiesList.length === 0) return null;
  const proxy = proxiesList[proxyIndex];
  proxyIndex = (proxyIndex + 1) % proxiesList.length;
  return proxy;
}

function createAxiosInstanceWithProxy(proxy) {
  if (!proxy) {
    return axios;
  }
  const agent = new HttpsProxyAgent(proxy.startsWith("http://") || proxy.startsWith("https://") ? proxy : "http://" + proxy);
  return axios.create({
    timeout: 30000,
    httpAgent: agent,
    httpsAgent: agent,
    proxy: false,
  });
}

async function getProxyIP(axiosInstance) {
  try {
    const response = await axiosInstance.get("http://api64.ipify.org?format=json");
    return response.data.ip;
  } catch (error) {
    console.error("Failed to get current IP:", error.message);
    return "Unknown";
  }
}

async function solveTurnstileLocal() {
  console.log("🔄 Waiting for Bypass Cloudflare...");
  const axiosNoProxy = axios.create({ timeout: 30000 });

  let captchaId = null;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const inForm = new URLSearchParams();
    inForm.append("key", API_KEY_2CAPTCHA);
    inForm.append("method", "turnstile");
    inForm.append("sitekey", TURNSTILE_SITE_KEY);
    inForm.append("pageurl", PAGE_URL);
    inForm.append("json", "1");

    try {
      const inRes = await axiosNoProxy.post("https://2captcha.com/in.php", inForm, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      if (inRes.data.status === 1) {
        captchaId = inRes.data.request;
        break;
      } else {
        console.error("❌ 2Captcha in.php returned error:", inRes.data);
      }
    } catch (err) {
      console.error("❌ Error sending in.php to 2Captcha:", err.message);
    }
    await delay(2000);
  }

  if (!captchaId) {
    console.log("❌ in.php failed after 5 attempts");
    return null;
  }

  let turnstileToken = null;
  for (let i = 0; i < 10; i++) {
    await delay(5000);
    const resForm = new URLSearchParams();
    resForm.append("key", API_KEY_2CAPTCHA);
    resForm.append("action", "get");
    resForm.append("id", captchaId);
    resForm.append("json", "1");

    try {
      const resRes = await axiosNoProxy.post("https://2captcha.com/res.php", resForm, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });

      if (resRes.data.status === 1) {
        turnstileToken = resRes.data.request;
        break;
      } else if (resRes.data.request === "CAPCHA_NOT_READY") {
      } else {
        console.error("❌ 2Captcha res.php returned error:", resRes.data);
        break;
      }
    } catch (err) {
      console.error("❌ Error sending res.php to 2Captcha:", err.message);
      break;
    }
  }

  if (!turnstileToken) {
    console.log("❌ Could not solve Turnstile (timeout).");
    return null;
  }

  console.log("✅ Bypass Cloudflare successfully");
  return turnstileToken;
}

async function login(email, password, proxy) {
  const turnstileToken = await solveTurnstileLocal();
  if (!turnstileToken) {
    console.error(`[${email}] Solve Turnstile failed.`);
    return null;
  }

  try {
    const axiosInstance = createAxiosInstanceWithProxy(proxy);
    const response = await axiosInstance.post(
      LOGIN_URL,
      {
        email,
        password,
        turnstileToken,
      },
      {
        headers: {
          'x-api-key': X_API
        }
      }
    );
    const accessToken = response.data.access_token;
    console.log(`[${email}] => Get access token successfully`);
    return accessToken;
  } catch (error) {
    console.error(`[${email}] Login error:`, error.response ? error.response.data : error.message);
    return null;
  }
}

async function refreshTokens() {
  console.log("Starting token retrieval for all accounts...");

  try {
    await fs.access(TOKENS_FILE);
    await fs.unlink(TOKENS_FILE);
    console.log("Cleared old tokens.txt");
  } catch {
    console.log("No old tokens.txt, creating new file");
  }

  try {
    await fs.access("failed.txt");
    await fs.unlink("failed.txt");
    console.log("Cleared old failed.txt");
  } catch {
    console.log("No old failed.txt, creating new file");
  }

  proxiesList = await loadProxies(PROXIES_FILE);
  if (proxiesList.length === 0) {
    console.log("No proxies found. Using direct connection for Teneo login.");
  } else {
    console.log(`Loaded ${proxiesList.length} proxies`);
  }

  const accounts = await readAccounts(ACCOUNTS_FILE);
  if (!accounts.length) {
    console.log("No accounts found in accounts.txt");
    return;
  }

  const limit = pLimit(THREADS);

  await Promise.all(accounts.map(account =>
    limit(async () => {
      const proxy = getNextProxy();
      const axiosInstance = createAxiosInstanceWithProxy(proxy);
      const currentIP = await getProxyIP(axiosInstance);
      console.log(`[${account.email}] => Using proxy: ${currentIP}`);

      const token = await login(account.email, account.password, proxy);
      if (token) {
        await fs.appendFile(TOKENS_FILE, token + "\n", "utf8");
        console.log(`[${account.email}] => Token saved`);
      } else {
        console.log(`[${account.email}] => Login/Token retrieval failed.`);
        await fs.appendFile("failed.txt", `${account.email}|${account.password}\n`, "utf8");
      }
    })
  ));
  console.log("Done processing all accounts.");
}

refreshTokens().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
