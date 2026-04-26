# ICU Logbook — Tester Guide

Welcome! This guide will walk you through getting the ICU Logbook app running on your computer so you can test it. No coding experience is needed — just follow each step in order.

Before you start, ask the developer for:
- The **Supabase URL** (looks like `https://something.supabase.co`)
- The **Supabase Anon Key** (a long string of letters and numbers)

You will need these in Step 4. Keep them handy.

---

## Which section should I read?

- **Mac computer → test on iPhone simulator** → [Mac Guide — iOS](#mac-guide--ios-simulator)
- **Mac computer → test on Android simulator** → [Mac Guide — Android](#mac-guide--android-simulator)
- **Windows computer** → [Windows Guide — Android](#windows-guide--android-simulator)

> **Note:** iPhone testing is only possible on a Mac. Windows users can only test the Android version.

---

---

# Mac Guide — iOS Simulator

This gets the app running in a simulated iPhone on your Mac screen. No real phone needed.

**Time to complete:** About 1–2 hours (most of this is waiting for downloads).

---

## Step 1 — Install Xcode

Xcode is Apple's tool for building iPhone apps. It's free but large (~15 GB).

1. Open the **App Store** on your Mac (the blue icon with an "A" in your dock or Applications folder).
2. In the search bar at the top, type **Xcode** and press Enter.
3. Click **Get** or the cloud download icon next to Xcode (made by Apple Inc.).
4. Wait for it to download and install. This can take 20–60 minutes depending on your internet speed. ☕

When it finishes:

5. Open **Xcode** from your Applications folder.
6. A window will appear asking you to install additional components. Click **Install** and enter your Mac password if asked.
7. Wait for that to finish, then close Xcode.

---

## Step 2 — Install Homebrew

Homebrew is a tool that makes installing software on Mac much easier.

1. Open **Terminal**. You can find it by pressing **Command + Space**, typing `Terminal`, and pressing Enter.
2. Copy and paste this entire line into Terminal, then press Enter:

```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

3. It will ask for your Mac password. Type it (nothing will appear on screen as you type — that is normal) and press Enter.
4. It may ask you to press Enter again to confirm. Do so.
5. Wait for it to finish. You will see a lot of text scrolling by — this is normal.

When you see a `$` symbol appear again at the bottom of Terminal, it is done.

> **If you see a message about "Next steps" or running additional commands at the end**, copy each command it shows and run them one at a time. This usually happens on newer Macs (M1/M2/M3).

---

## Step 3 — Install Node.js and Git

Node.js runs the app's code. Git downloads the app from the internet.

In Terminal, copy and paste this line and press Enter:

```
brew install node git
```

Wait for it to finish (a few minutes). You will see text scrolling — normal.

**Check it worked:** Type this and press Enter:

```
node --version
```

You should see something like `v22.0.0` (the exact number doesn't matter). If you see a version number, you are good to go.

---

## Step 4 — Download the app code

1. In Terminal, copy and paste this and press Enter:

```
cd ~/Desktop && git clone https://github.com/shawntanzk/ICU-Logbook.git
```

This downloads the app code to your Desktop. You will see a folder called **ICU-Logbook** appear there.

2. Now tell Terminal to work inside that folder:

```
cd ~/Desktop/ICU-Logbook
```

---

## Step 5 — Set up your credentials file

The app needs to connect to the server. You will create a small settings file for this.

1. In Terminal, type this and press Enter:

```
cp .env.example .env
```

2. Now open the file you just created. In Terminal, type:

```
open -e .env
```

This opens the file in TextEdit. You will see two lines that look like:

```
EXPO_PUBLIC_SUPABASE_URL=your_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key_here
```

3. Replace `your_url_here` with the **Supabase URL** the developer gave you.
4. Replace `your_key_here` with the **Supabase Anon Key** the developer gave you.

It should end up looking something like:
```
EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

5. Press **Command + S** to save, then close TextEdit.

---

## Step 6 — Install the app's dependencies

Back in Terminal (make sure you are still in the ICU-Logbook folder — if you closed Terminal, repeat the `cd ~/Desktop/ICU-Logbook` command):

```
npm install
```

This downloads everything the app needs to run. It takes 2–5 minutes. You will see a lot of text — this is normal.

When you see the `$` symbol again, it is done.

---

## Step 7 — Run the app

This step builds and launches the app inside an iPhone simulator on your screen.

In Terminal, type:

```
npx expo run:ios
```

**The first time you run this, it will take 5–15 minutes.** It is compiling the app. You will see a lot of text scrolling. This is normal — do not close Terminal.

When it is ready, a window will appear showing a simulated iPhone, and the ICU Logbook app will open automatically inside it.

> **If a dialog appears asking to install the iOS Simulator, click Install.**

---

## Step 8 — Using the app

You can interact with the simulated iPhone just like a real phone:
- **Click** anywhere to tap
- **Click and drag** to scroll
- Use your **keyboard** to type

To **quit**, press **Control + C** in Terminal.

---

## Running the app again in future

Once set up, you only need to do this each time:

1. Open Terminal
2. Type `cd ~/Desktop/ICU-Logbook` and press Enter
3. Type `npx expo run:ios` and press Enter

It will be much faster from the second time onwards (1–2 minutes instead of 15).

---

---

# Mac Guide — Android Simulator

Use this if you prefer to test the Android version on your Mac, or if the iOS setup above did not work.

**Time to complete:** About 45–90 minutes.

---

## Step 1 — Install Homebrew, Node.js, and Git

If you already followed the iOS guide, skip to Step 2.

1. Open **Terminal** (Command + Space → type Terminal → Enter).

2. Install Homebrew:
```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
Follow any prompts, enter your password when asked.

3. Install Node.js and Git:
```
brew install node git
```

---

## Step 2 — Install Android Studio

1. Go to **[developer.android.com/studio](https://developer.android.com/studio)** in your browser.
2. Click the big **Download Android Studio** button.
3. Open the downloaded `.dmg` file and drag Android Studio into your Applications folder.
4. Open Android Studio from your Applications folder.
5. Click through the Setup Wizard:
   - Click **Next** on the Welcome screen
   - Choose **Standard** installation type → click **Next**
   - Accept the licence agreements by clicking **Accept** for each one → click **Finish**
6. It will download more components. Wait for it to finish (5–15 minutes).

---

## Step 3 — Create a virtual Android phone

1. In Android Studio, click **More Actions** (or the three-dot menu) → **Virtual Device Manager**.
2. Click **Create Device**.
3. Select **Pixel 8** from the list → click **Next**.
4. Under "Recommended", click the **Download** link next to the latest release (the one without a warning icon) → wait for it to download → click **Next**.
5. Click **Finish**.

You now have a virtual Android phone. You can close Android Studio.

---

## Step 4 — Set the Android path

Android Studio installs itself in a location that Terminal needs to know about.

1. In Terminal, paste this and press Enter:

```
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc && echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.zshrc && source ~/.zshrc
```

2. Check it worked:
```
adb --version
```
You should see something like `Android Debug Bridge version 1.0.41`. If you do, it worked.

---

## Steps 5, 6, 7 — Get the code, set up credentials, install dependencies

Follow **Steps 4, 5, and 6** from the iOS guide above. They are identical.

---

## Step 8 — Run the app

1. First, open your virtual Android phone. In Terminal:
```
$ANDROID_HOME/emulator/emulator -avd Pixel_8_API_35 &
```
Wait until the virtual phone is fully booted (you will see a home screen inside the emulator window).

2. Then run the app:
```
cd ~/Desktop/ICU-Logbook && npx expo run:android
```

The first run takes 5–15 minutes. The app will open automatically in the virtual phone when ready.

---

## Running the app again in future

1. Open Terminal
2. Start the virtual phone: `$ANDROID_HOME/emulator/emulator -avd Pixel_8_API_35 &`
3. Wait for it to boot, then: `cd ~/Desktop/ICU-Logbook && npx expo run:android`

---

---

# Windows Guide — Android Simulator

> **Note:** iPhone/iOS testing is not possible on Windows. This guide sets up an Android simulator only.

**Time to complete:** About 45–90 minutes.

---

## Step 1 — Install Node.js

1. Go to **[nodejs.org](https://nodejs.org)** in your browser.
2. Click the button that says **LTS** (the recommended version for most users).
3. Open the downloaded file and click through the installer:
   - Click **Next**, **Next**
   - Accept the licence agreement
   - Keep all the default options
   - Click **Install**
   - Click **Finish**

**Check it worked:**
1. Press the **Windows key**, type `cmd`, and open **Command Prompt**.
2. Type `node --version` and press Enter.
3. You should see something like `v22.0.0`. If you do, Node.js is installed.

---

## Step 2 — Install Git

1. Go to **[git-scm.com/download/win](https://git-scm.com/download/win)** in your browser.
2. The download should start automatically. If not, click the link for the 64-bit version.
3. Open the downloaded file and click through the installer:
   - Click **Next** through all the options — the defaults are all fine
   - Click **Install**
   - Click **Finish** (you can uncheck "View Release Notes")

---

## Step 3 — Install Android Studio

1. Go to **[developer.android.com/studio](https://developer.android.com/studio)** in your browser.
2. Click **Download Android Studio**.
3. Open the downloaded `.exe` file and follow the installer:
   - Click **Next**
   - Make sure **Android Virtual Device** is ticked → click **Next**
   - Keep the default install location → click **Next** → click **Install**
   - Click **Finish** to open Android Studio

4. In the Android Studio Setup Wizard:
   - Click **Next** on the Welcome screen
   - Choose **Standard** → click **Next**
   - Accept the licence agreements → click **Finish**
5. Wait for downloads to complete (5–15 minutes).

---

## Step 4 — Create a virtual Android phone

1. In Android Studio, click **More Actions** → **Virtual Device Manager**.
2. Click **Create Device**.
3. Select **Pixel 8** → click **Next**.
4. Under "Recommended", click **Download** next to the latest release → wait → click **Next**.
5. Click **Finish**.

---

## Step 5 — Set the Android path

Windows needs to know where Android Studio installed its tools.

1. Press the **Windows key**, search for **"Environment Variables"**, and click **"Edit the system environment variables"**.
2. At the bottom of the window, click **"Environment Variables..."**.
3. Under "User variables", click **New**:
   - Variable name: `ANDROID_HOME`
   - Variable value: `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk`
   - Replace `YOUR_USERNAME` with your actual Windows username
   - Click **OK**
4. In the same "User variables" section, find the variable called **Path** and double-click it.
5. Click **New** and add:
   `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk\platform-tools`
6. Click **OK** on all windows to save.

7. **Close and reopen Command Prompt** for the changes to take effect.

8. Check it worked — in the new Command Prompt, type:
```
adb --version
```
You should see `Android Debug Bridge version...`. If you do, it worked.

---

## Step 6 — Download the app code

1. Open **Command Prompt** (Windows key → type `cmd` → Enter).
2. Navigate to your Desktop:
```
cd %USERPROFILE%\Desktop
```
3. Download the code:
```
git clone https://github.com/shawntanzk/ICU-Logbook.git
```
4. Move into the folder:
```
cd ICU-Logbook
```

---

## Step 7 — Set up your credentials file

1. In Command Prompt, type:
```
copy .env.example .env
```

2. Open File Explorer and navigate to your Desktop → ICU-Logbook folder.
3. Find the file called `.env` (it may just show as `env` without the dot, depending on your settings).
4. Right-click it → **Open with** → **Notepad**.
5. You will see:
```
EXPO_PUBLIC_SUPABASE_URL=your_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key_here
```
6. Replace `your_url_here` with the **Supabase URL** from the developer.
7. Replace `your_key_here` with the **Supabase Anon Key** from the developer.
8. Press **Ctrl + S** to save, then close Notepad.

> **Tip:** If you cannot find the `.env` file in File Explorer, open Notepad first, then use File → Open → navigate to the ICU-Logbook folder → change the file filter to "All Files" → you will see `.env` in the list.

---

## Step 8 — Install dependencies

In Command Prompt (make sure you are still in the ICU-Logbook folder):
```
npm install
```

Wait 2–5 minutes for it to finish.

---

## Step 9 — Run the app

1. Open the virtual Android phone. In Android Studio, click **More Actions** → **Virtual Device Manager** → click the **Play (▶)** button next to your Pixel 8 device.

2. Wait until the virtual phone finishes booting. You will see a home screen appear in the emulator window.

3. In Command Prompt, type:
```
npx expo run:android
```

The first time takes 5–15 minutes. When ready, the ICU Logbook app will open automatically in the virtual phone.

---

## Running the app again in future

1. Open Android Studio → Virtual Device Manager → click Play on the Pixel 8
2. Wait for it to boot
3. Open Command Prompt → `cd %USERPROFILE%\Desktop\ICU-Logbook` → `npx expo run:android`

---

---

# Troubleshooting

### "command not found: node"
Node.js is not installed or Terminal cannot find it. On Mac, close Terminal and reopen it, then try again. On Windows, close and reopen Command Prompt.

### The app is stuck on a loading screen
Press **R** in the Terminal/Command Prompt window where the app is running. This refreshes the app.

### "Unable to resolve module" error
Run `npm install` again, then retry.

### The virtual phone is very slow
This is normal — virtual phones use your computer's processor to simulate a phone, which can be slow. Give it a minute to settle after booting before launching the app.

### "SDK location not found" (Android)
The `ANDROID_HOME` path is not set correctly. On Mac, re-run the command in Step 4 of the Android guide. On Windows, double-check the path in Environment Variables — make sure your username is spelled correctly.

### I see a red error screen in the app
Take a screenshot and send it to the developer. Press **R** in Terminal to try reloading first.

### "xcrun: error" or "Xcode not found" (Mac iOS)
Open Xcode once manually, accept the licence agreement, and try again. If that does not help, run this in Terminal:
```
sudo xcode-select --switch /Applications/Xcode.app
```

---

# Giving Feedback

When you find something to report, please include:

1. **What you were doing** — e.g. "I was trying to add a new case"
2. **What you expected to happen**
3. **What actually happened**
4. **A screenshot** if there is an error message on screen

Send feedback to the developer directly or via the agreed feedback channel.

Thank you for testing! 🙏
