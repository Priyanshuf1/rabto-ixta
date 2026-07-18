# Rabto Ixta

Rabto Ixta is a locally running Instagram data exploration tool that resolves public Instagram usernames, retrieves available account information, combines similar accounts, followers and following, removes duplicate profiles and displays the available results through its existing visual interface.

## Important Project Information

- Rabto Ixta runs locally on the user’s computer.
- GitHub only hosts the project files.
- Opening the GitHub link does not automatically open the application.
- The user must download or clone the repository, install it and start it.
- The application opens through localhost after startup.
- The tool requires an internet connection.
- The tool is not completely offline.
- A personal RapidAPI key is recommended or required for reliable usage.
- The project is not affiliated with Instagram, Meta or RapidAPI.
- It is intended for educational, research and authorised use.

GitHub hosts the project files. Rabto Ixta opens on localhost only after the project is downloaded, installed and started on the user’s computer.

## Features

- Username-to-numeric-ID resolution
- Public account-information retrieval
- Similar-account extraction
- Followers extraction when returned by the API
- Following extraction when returned by the API
- Combining the three result sources
- Duplicate-profile removal
- Existing image or profile carousel
- Localhost browser interface
- Bring Your Own Key support

## Requirements

- Node.js 22 LTS or newer (Node.js v24 is also acceptable because it is newer than Node.js 22)
- npm
- Git, when using the clone method
- Internet connection
- RapidAPI account
- Active subscription to a compatible FlashAPI1 plan
- A valid X-RapidAPI-Key

Verification commands:
```bash
node --version
npm --version
git --version
```

## Quick Start

### Step 1: Clone the repository
```bash
git clone https://github.com/Priyanshuf1/rabto-ixta.git
cd rabto-ixta
```

### Step 2: Install root dependencies
```bash
npm install
```

### Step 3: Prepare the complete project
```bash
npm run setup
```
This prepares backend and frontend dependencies and builds the frontend.

### Step 4: Start Rabto Ixta
```bash
npm start
```
The terminal prints the actual localhost address.
The browser should open automatically.
The default address is normally:
http://localhost:3002
A different port may be selected when port 3002 is occupied.
Keep the terminal open while using the application.
Press Ctrl+C to stop the application.

## Download and Run Without Git

1. Open the Rabto Ixta GitHub repository.
2. Click the green Code button.
3. Click Download ZIP.
4. Wait for the ZIP file to download.
5. Open the Downloads folder.
6. Right-click the ZIP file.
7. Select Extract All on Windows or use the operating system’s extraction option.
8. Open the extracted Rabto Ixta folder.
9. Click the folder address bar, type cmd and press Enter on Windows, or open a terminal in that folder.
10. Run:
```bash
npm install
npm run setup
npm start
```
The ZIP method does not require a `.git` directory.

## Startup Options

Start normally:
```bash
npm start
```

Start without automatically opening the browser:
```bash
npm start -- --no-open
```

Use a specific port:
```bash
npm start -- --port 4000
```
An explicitly requested occupied port may produce an error.

Show CLI help:
```bash
node cli.js --help
```

Show the application version:
```bash
node cli.js --version
```

## How to Get Your RapidAPI Key — Complete Guide

### Step 1: Open RapidAPI
- Open: https://rapidapi.com/
- Click Sign Up when the user does not have an account.
- Sign up using email, Google, GitHub or another available method.
- Complete email verification when requested.
- Log in to RapidAPI.

### Step 2: Search for FlashAPI1
- Locate the RapidAPI search bar.
- Search for: FlashAPI1
- Open the FlashAPI1 Instagram API result.
- Check that the API host is compatible with: flashapi1.p.rapidapi.com
- Direct FlashAPI1 listing, when available:

https://rapidapi.com/for-sharm/api/flashapi1
- RapidAPI can change page layouts, provider names and listing details.

### Step 3: Open the Pricing section
- Click the Pricing tab.
- Read every available plan.
- Look for a free or Basic plan only when one is currently available.
- Check:
  - Monthly request allowance
  - Daily limits
  - Rate limits
  - Overage charges
  - Billing requirements
  - Renewal terms
- Select the desired plan.
- Click Subscribe.
- Confirm the subscription.

**WARNING**: RapidAPI plans, free allowances, quotas and overage prices are controlled by the API provider and may change. Rabto Ixta does not control third-party pricing.

### Step 4: Open the Endpoints tab
- Return to the API listing.
- Click Endpoints.
- Select an endpoint from the left-side endpoint list.
- Prefer a lightweight public username-information endpoint for testing.
- Enter a valid public Instagram username.
- Do not enter an Instagram password.

### Step 5: Select a RapidAPI application
API keys are associated with RapidAPI applications.

- Locate the application or context selector near the endpoint tester or code area.
- Select the default or personal RapidAPI application.
- When no application is available:
  - Open the Developer Dashboard.
  - Open Apps, My Apps or the equivalent current menu.
  - Click the option to create an application.
  - Name it: Rabto Ixta Local
  - Save it.
  - Return to FlashAPI1.
  - Select the newly created application.

### Step 6: Find X-RapidAPI-Key

**Method A: Endpoint code snippet**
- Open the Endpoints tab.
- Select an endpoint.
- Locate Code Snippets.
- Select JavaScript, Node.js, fetch or another supported language.
- Find the header named: X-RapidAPI-Key
- Click the copy control where available.
- Copy only the key value.
- Do not copy quotation marks, commas or code around it.

**Method B: Developer Dashboard**
- Open the RapidAPI Developer Dashboard.
- Open Apps or My Apps.
- Select the application being used.
- Open Authorization, Security or the equivalent current section.
- Find the application key.
- Reveal it when RapidAPI provides a reveal button.
- Copy the value associated with X-RapidAPI-Key.

Button names can differ slightly when RapidAPI changes its dashboard.

### Step 7: Test the API key
- Return to the FlashAPI1 Endpoints page.
- Select the correct RapidAPI application.
- Enter a valid public Instagram username.
- Click Test Endpoint.
- Wait for the response.
- Check that the response does not say:
  - Invalid API key
  - Unauthorized
  - Not subscribed
  - Too many requests
  - Quota exceeded
- A successful response normally means:
  - The key is recognised.
  - The plan is active.
  - The endpoint is responding.
  - The quota has not been exhausted.

### Step 8: Start Rabto Ixta
Use:
```bash
npm start
```
The terminal must remain open.

### Step 9: Paste the key inside Rabto Ixta
- Wait for the browser interface to open.
- Locate the RapidAPI key input.
- Paste the copied key.
- Do not add quotation marks.
- Do not add spaces before or after the key.
- Enter a valid public Instagram username.
- Start the lookup.
- Wait for the available sources:
  - Similar accounts
  - Followers
  - Following
- Returned profiles are combined and deduplicated.

### Step 10: Protect the API key
> **WARNING**
> Treat the API key like a password.
> Never publish it in GitHub.
> Never paste it into README.md.
> Never include it in screenshots.
> Never send it in public messages.
> Never commit a .env file containing the key.
> Anyone with the key may use the user’s API quota.
> Monitor usage through the RapidAPI dashboard.

### Step 11: Rotate a leaked key
- Open the RapidAPI Developer Dashboard.
- Open Apps or My Apps.
- Select the affected application.
- Open Authorization or Security settings.
- Generate a replacement key where supported.
- Test the replacement key.
- Replace the old key in the local application.
- Revoke or delete the exposed key.
- Review API usage for suspicious requests.
- Never continue using a publicly exposed key.

### Step 12: Common API-key errors

| Error | Meaning | Recommended action |
|---|---|---|
| Invalid API key | Key is incorrect or revoked | Copy the key again or generate a replacement |
| Not subscribed | The app is not subscribed to FlashAPI1 | Open Pricing and subscribe to a current plan |
| Unauthorized | Wrong key, application or endpoint access | Check the selected RapidAPI application |
| Too many requests | Rate limit reached | Wait and retry later |
| Quota exceeded | Monthly or daily allowance is exhausted | Wait for reset or review the current plan |
| Network error | API or connection may be unavailable | Check the internet connection and retry |
| No result | Username may be private, changed, disabled or unsupported | Verify the username and try another public account |

## Use Your Key in Rabto Ixta

- Start the tool with `npm start`.
- Wait for the browser to open.
- Paste the key into the API-key field.
- Enter a public username.
- Start lookup.
- Wait for the result sources.
- Review combined results.

Never place your personal API key directly inside the project’s source files.

## Accuracy and Limitations

Rabto Ixta is not guaranteed to be 100% accurate. In the developer’s limited informal manual testing sample, the tool showed an estimated successful-result or accuracy rate of approximately 90–92%. This is not an independently audited benchmark, not an official Instagram figure and not a guarantee for every lookup.

- An informal developer estimate
- Based on limited manual testing
- Not independently verified
- Not guaranteed

- Third-party API information may be incomplete.
- Results may be delayed or outdated.
- Private accounts may return limited or no data.
- Disabled, deleted or renamed accounts may not resolve.
- Follower and following results may be partial.
- Similar-account recommendations can change.
- API quota limits can interrupt results.
- Network outages can cause failures.
- Instagram and the API provider can change behaviour.
- Duplicate removal depends on returned identifiers.
- One successful source does not guarantee that all sources will succeed.

Do not use Rabto Ixta as the sole basis for identity verification, legal decisions, employment decisions, financial decisions, safety decisions or other high-stakes decisions.

## Troubleshooting

- **Missing script: setup** and **userContributedKeys is not defined**: You may have an old clone. Run:
  ```bash
  git fetch origin
  git switch master
  git pull origin master
  npm install
  npm run setup
  npm start
  ```
  When the folder contains unimportant old test files, users may instead make a fresh clone.
- **Node.js version too old**: Update Node.js to 22 LTS or newer.
- **npm not recognised**: Ensure Node and npm are correctly installed and in your system PATH.
- **Git not recognised**: Ensure Git is installed and in your system PATH.
- **npm install failure**: Delete the `node_modules` folder and retry `npm install`.
- **Frontend build missing**: Run `npm run setup` to build the frontend.
- **Port 3002 occupied**: The launcher automatically finds another port, or specify one via `npm start -- --port 4000`.
- **Browser did not open**: Open `http://localhost:3002` manually in your browser.
- **API key rejected**: Verify that your key is pasted correctly without quotes or spaces.
- **Not subscribed**: Subscribe to the FlashAPI1 API as detailed in the API guide.
- **Quota exhausted**: Wait for your quota to reset or upgrade your plan.
- **No account result**: Ensure the Instagram username is correct, public, and not disabled/deleted.
- **Partial followers or following**: The API may limit the data returned depending on conditions outside of the application's control.
- **How to stop the server**: Press `Ctrl+C` in your terminal.

## Responsible Use and Disclaimer

- Use only for lawful and authorised purposes.
- Respect privacy.
- Respect Instagram’s terms.
- Respect RapidAPI’s terms.
- Do not use the tool for stalking.
- Do not use it for harassment.
- Do not use it for impersonation.
- Do not attempt to bypass private-account restrictions.
- Do not use it for unauthorised surveillance.
- The project depends on a third-party API.
- The developer does not control third-party availability or accuracy.
- The project is not affiliated with Instagram, Meta or RapidAPI.

## Author

Priyanshu Awasthi

GitHub profile:
https://github.com/Priyanshuf1

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
