# Sewa - Your AI-Powered Healthcare Companion 

Sewa is a modern, comprehensive healthcare companion application designed to empower users to manage their health proactively. Built with a clean, responsive interface, Sewa leverages the power of the Google Gemini API to provide intelligent insights, streamline health tracking, and bridge language barriers in medical care.

## 🚀 Live Link

[**Access the live application here**](https://sewa-dbvn.onrender.com/)

---

## ✨ Key Features

### 🩺 Core Health Management
- **Dashboard:** A centralized hub providing an at-a-glance summary of your health, including upcoming appointments, next medication reminders, and quick access to essential tools.
- **Medication Management:** Add, track, and manage your medications. Set custom reminders and receive timely browser notifications to ensure you never miss a dose.
- **Appointment Tracking:** Keep a clear record of all your upcoming and past medical appointments.
- **Profile Management:** Easily manage your personal information and emergency contact details.

### 🤖 AI-Powered Intelligence
- **Symptom Checker:** Describe symptoms via text or multi-language voice input. Receive AI-generated recommendations for relevant medical specialists.
- **In-Depth Analysis:** Go beyond basic recommendations with a deep analysis of your symptoms, grounded in Google Search, providing potential conditions, severity assessments, and next steps.
- **AI Document Analysis:**
  - **Upload & Scan:** Upload medical records from a file or capture them using your device's camera.
  - **Text Extraction (OCR):** AI automatically extracts all readable text from your document images.
  - **Translation & Highlighting:** Translate extracted text and see critical information—diagnoses, medications, lab values—automatically highlighted.
- **Drug Price Comparison:** Search for any medication and get real-time price comparisons between brand-name and generic alternatives, grounded in Google Search.
- **AI Wellness Companion:** Engage in real-time voice conversations with a supportive AI companion. The companion provides empathetic support and can suggest a guided meditation when it detects stress.
- **Emergency Alert Generation:** Critical vital readings can trigger an AI-generated, concise emergency alert message for your emergency contact.

### 📊 Advanced Health Tracking
- **Vital Signs Monitor (Simulated):** A real-time dashboard to monitor key vitals (Heart Rate, Blood Pressure, SpO2). Features historical data charts with zoom capabilities and an emergency alert system.
- **Mental Wellness Hub:** A dedicated space for mental well-being:
  - **Mood Tracker:** Log your daily mood and visualize trends over the week.
  - **Guided Meditation:** Access a quick, 5-minute guided meditation session.
  - **Personal Journal:** A private space to write down your thoughts and reflections.

### 🌐 UI/UX & Accessibility
- **Responsive Design:** A seamless experience on both desktop and mobile devices.
- **Global Search:** Instantly find appointments, medications, and health records.
- **Multilingual Support:** Switch the entire UI between English and Spanish.
- **Offline Capability:** Access key information without an internet connection, thanks to a robust service worker.

---

## 💻 Tech Stack

- **Frontend Framework:** `React`
- **Language:** `TypeScript`
- **AI/ML:** `Google Gemini API` (`@google/genai`)
- **Styling:** `Tailwind CSS`
- **Charting:** `Recharts`
- **Web APIs:**
  - Web Speech API
  - Notifications API
  - WebRTC (getUserMedia)
- **Offline Support:** `Service Workers`
- **Module System:** ES Modules with `Import Maps` (no build step required)
