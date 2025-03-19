# 🚀 Teneo Node CLI Version

Get rewarded in **$TENEO Tokens** by running a node that helps access public social media data. It's **easy, passive**, and you **earn rewards** from the value you contribute.

---

## 🌟 Features

🔹 **Seamless Account Management** – Register, login, and run nodes effortlessly.

🔹 **Automated Node Execution** – Ensures smooth and uninterrupted operation.

🔹 **Self-Healing System** – Auto-reconnect and auto-login for stable performance.

🔹 **Multi-Account Support** – Manage multiple accounts with ease.

🔹 **Proxy Compatibility** – Enhance security and anonymity with proxy integration.

🔹 **Customizable Settings** – Adjust API keys, thread limits, and more.

---

## 🔧 Installation

### 📌 Requirements
- **Node.js** (>=14.x)
- **Git**

### 💻 macOS/Linux Setup

1. Install dependencies
```bash
sudo apt update && sudo apt install git nodejs npm -y
```

2. Clone the repository
```bash
git clone https://github.com/rpchubs/Teneo-BOT.git
cd Teneo-BOT
```

3. Install required packages
```bash
npm install
```

### 🖥️ Windows Setup
1. Download and install [Node.js](https://nodejs.org/).
2. Download and install [Git](https://git-scm.com/).
3. Open **Command Prompt (cmd)** or **PowerShell** and run:

```bash
# Clone the repository
git clone https://github.com/rpchubs/Teneo-BOT.git
cd Teneo-BOT
```

```bash
# Install required packages
npm install
```

---

## 🛠️ Configuration

### 🔑 **Setting API Key & Threads**
- Open `getToken.js` and **edit the following lines**:
  ```js
  const THREADS = 10;  // Change this to adjust concurrent requests
  const API_KEY_2CAPTCHA = "your-2captcha-key";  // Enter your 2Captcha API Key
  ```
- Save the file after making the changes.

---

## 🚀 Running the Script

### 🏃 Running Single Account Node
```bash
node main.js
```

### 🔄 Running Multiple Accounts
1. **Add Tokens:**
   - Open `tokens.txt` and **add your account tokens (one per line).**
   ```bash
   nano tokens.txt
   ```

2. **(Optional) Add Proxy List:**
   - Open `proxies.txt` and **add proxies (one per line).**
   ```bash
   nano proxies.txt
   ```

3. **Auto-Generate Tokens (if not manually added):**
   - Open `accounts.txt` and **add accounts in format**: `email|password` (one per line).
   ```bash
   nano accounts.txt
   ```
   - Run the script to get tokens:
   ```bash
   node getToken.js
   ```

4. **Start Multi-Account Mode:**
   ```bash
   node multy.js
   ```

---

## ⚠️ Disclaimer
**Using the CLI version is at your own risk.** While this is not considered cheating, there is a potential for account bans as the official `Teneo Node Beta` only supports browser extensions.

---

### 🎯 Start Earning Now!
🚀 Run the node and enjoy earning passive income with **$TENEO Tokens**!

---

📢 **Need Help?** Open an issue on GitHub or join the community!

