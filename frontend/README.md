# ⚡ ZapChat - Complete Project Documentation (Final Year Project)

Welcome to the **ZapChat** official documentation. This file serves as the definitive guide to every feature, module, technology, and architectural decision implemented in this project from its inception. ZapChat is a high-fidelity, real-time communication platform built to mirror the seamless experience of industry-leading applications like WhatsApp and iOS iMessage.

---

## 🛠️ Complete Technology Stack (استعمال ہونے والی ٹیکنالوجیز)

### **Frontend Frameworks & Libraries (فرنٹ اینڈ)**
*   **React 19 (Vite)**: Core UI framework with Vite as the lightning-fast build tool and bundler.
*   **React Router DOM**: Client-side Single Page Application (SPA) routing.
*   **React Context API**: Global state management handling Auth, Sockets, and Call states.
*   **Capacitor.js (`@capacitor/core`, `@capacitor/android`)**: Framework used to wrap and convert the React web app into a native **Android APK**.
*   **Socket.IO-Client (`socket.io-client`)**: Bi-directional event-driven websocket communication.
*   **Leaflet & React-Leaflet**: Libraries for rendering interactive, drag-and-drop map interfaces.
*   **Emoji-Picker-React**: Comprehensive library for Emojis and parsing GIFs.
*   **Axios & Fetch API**: Handling HTTP requests and multipart file uploads.
*   **Lucide-React**: Clean, professional SVG icon rendering.
*   **Vanilla CSS3**: Custom styles featuring modern frosted glassmorphism (`backdrop-filter`) and CSS animations.

### **Native Browser APIs (نیٹو براؤزر سروسز)**
*   **WebRTC API (`RTCPeerConnection`)**: Native P2P engine for real-time video and audio mesh networking.
*   **MediaDevices API (`getUserMedia`)**: Accessing device cameras and microphones.
*   **Geolocation API**: Tracking precise coordinates for Live Location sharing.
*   **Vibration API (`navigator.vibrate`)**: Providing haptic feedback during long-presses.
*   **Web Share API (`navigator.share`)**: Triggering native mobile sharing menus.
*   **Clipboard API**: Copying messages seamlessly.

### **Backend Server & Database (بیک اینڈ اور ڈیٹا بیس)**
*   **Node.js & Express.js**: High-performance REST API and core server architecture.
*   **MongoDB & Mongoose**: NoSQL database and Object Data Modeling (ODM).
*   **Socket.IO (`socket.io`)**: Real-time websocket server for room management and presence.
*   **Multer & Multer-GridFS-Storage**: Advanced file handling system for uploading massive media files directly into MongoDB GridFS chunks.
*   **GridFS-Stream**: Streaming engine that pipes video and audio files dynamically.
*   **Node-Cron (`node-cron`)**: Automated job scheduler for 24-hour stories and expiring messages.
*   **Bcrypt (`bcrypt`)**: Cryptographic hashing for secure password storage.
*   **JWT (`jsonwebtoken`)**: Stateless user authentication and route protection.
*   **PDFKit (`pdfkit`)**: Generating PDF documents for exporting chat histories.
*   **Archiver (`archiver`)**: Zipping user data for GDPR-compliant account info requests.
*   **CORS & Dotenv**: Environment management and cross-origin resource sharing.

### **Third-Party APIs & Integrations (بیرونی سروسز)**
*   **Pollinations.AI**: Proxy integration for generating AI Chat Wallpapers via text prompts.
*   **UI-Avatars API**: Dynamically generating fallback profile pictures with user initials.
*   **Tenor API**: Sourcing live GIFs for the chat's Super Picker.

---

## 🚀 Exhaustive Feature List (مکمل فیچرز کی انتہائی گہری تفصیل)

### 1. 🔐 Authentication & Profiles (اکاؤنٹ اور پروفائل)
*   **Secure Registration/Login**: User authentication secured with Bcrypt password hashing and JWT sessions.
*   **Phone Number Validation**: Strict formatting logic to capture and display user phone numbers accurately across regions.
*   **Custom Profiles**: Users can upload custom Profile Pictures (stored in GridFS), update Display Names, and set their Bios.
*   **Online/Offline Presence**: Highly accurate real-time tracker showing exactly when a user was "last seen" or if they are currently "online".

### 2. 💬 Advanced Real-Time Messaging Engine (چیٹ سسٹم)
*   **Instant Delivery**: Messages are sent and received with zero latency using Optimistic UI updates.
*   **Read Receipts Sync**: WhatsApp-style tick system (Single Gray = Sent, Double Gray = Delivered, Double Blue = Read).
*   **Rich Media Engine**: Send Text, High-Res Images, HD Videos, and Voice Notes (with dynamic playback scrubbers).
*   **Live Audio Recording**: Built-in press-and-hold microphone UI to record and send voice notes instantly without leaving the chat.
*   **Interactive Maps & Location**: 
    *   **Static Maps**: Drag a pin on a live map to send an exact location.
    *   **Live Tracking**: Share real-time location that updates instantly as the user moves (using Geolocation API).
*   **Message Interactions**: Reply directly to specific messages (with clickable context previews), Forward messages to others, Copy text, and Export entire chat histories to `.txt` files.
*   **Message Reactions**: React to any message with emojis, which update instantly for all users in the chat.
*   **Pinned Messages**: Pin important messages to the top of the chat header for quick reference.
*   **Differential Deletion**: "Delete for Me" vs "Delete for Everyone" logic, including Admin override privileges.
*   **Super Picker Drawer**: A unified bottom drawer for Emojis, Stickers, and live GIF searching (via Tenor API integration).
*   **Multi-Select & Long Press**: Long-press a message on mobile (or right-click on desktop) to open context menus, select multiple messages, and perform bulk actions (delete, forward, copy).
*   **In-App Audio Cues**: Distinct pop sounds for sending and receiving messages.

### 3. 👥 Comprehensive Group System (گروپ مینجمنٹ)
*   **Group Creation**: Users can create groups, set a Group Name, and upload a custom Group Icon.
*   **Invitation Links**: Generate unique join links so users can join the group without being manually added by an admin.
*   **Role-Based Access Control (RBAC)**: Clear visual distinctions (Admin badges) between standard Members and Admins.
*   **Admin Privileges**: 
    *   Assign or remove admin rights from other members.
    *   Kick/Remove members from the group permanently.
    *   Delete *any* message in the group for everyone.
*   **Automated Moderation Controls**:
    *   **Slow Mode**: Admins can set cooldown timers between messages to prevent chat flooding.
    *   **Spam Detection**: Automated backend filters to block malicious or repetitive content.
*   **Disappearing Messages**: Configurable group timers (24h, 7 days, etc.) that automatically wipe messages from the database after a set duration.
*   **Mentions**: Type `@` to tag specific members within the group.

### 4. 📞 Multi-Party Mesh Conference Calling (ویڈو/آڈیو کالنگ)
*   **1-to-1 & Group Calls**: Seamlessly initiate Audio or Video calls natively in the browser.
*   **True WebRTC Mesh Network**: Automatically establishes direct WebRTC handshakes between every user in a group call without relying on a central media server.
*   **Group Caller ID Masking**: When an Admin calls a Group, all members receive the call showing the **Group's Name and Icon** ringing, rather than just the Admin's details.
*   **Real-time Connection UI**: Intelligent pulse animations that dynamically switch from "Calling..." to "Connected" the exact millisecond media tracks are successfully received.
*   **Targeted Disconnects (Kicking)**: Admins can instantly cut specific users from a group call. The mesh network automatically tears down that specific connection to free up bandwidth while keeping others connected.
*   **Universal Call Logging**: Every participant in a conference call has the call accurately recorded in their personal database history (e.g., distinguishing between "Group Call" and "Missed Video Call").

### 5. 📸 Status & Ephemeral Stories (سٹیٹس اور سٹوریز)
*   **24-Hour Expiry**: Users can upload Images, Videos, Voice Notes, or Text statuses that are auto-deleted by the `node-cron` backend job after exactly 24 hours.
*   **Viewership Tracking**: See exactly who has viewed your status, including timestamps.
*   **Status Rings**: The WhatsApp-style green/gray rings around profile pictures instantly indicate whether a user has unread status updates.
*   **Optimistic Uploads**: Statuses instantly appear locally while the GridFS upload processes silently in the background.

### 6. 📱 Contact Management & Privacy (رابطے اور پرائیویسی)
*   **Add Contacts**: Search and add users by their exact phone number or email address.
*   **Block Contacts**: Prevent specific users from sending messages or calling you.
*   **Mute Notifications**: Silence chat alerts for specific users or noisy groups.
*   **Global Search**: Search for specific contacts in the sidebar, or search for specific text/messages within an active chat.

### 7. 🎨 UI / UX & Premium Design Architecture (ڈیزائن اور اینیمیشنز)
*   **High-Fidelity Aesthetics**: Pixel-perfect design built to rival native iOS applications and WhatsApp Web.
*   **Frosted Glass (Glassmorphism)**: Heavy usage of `backdrop-filter: blur(20px)` in modals, dropdowns, and sticky headers for a premium, native feel.
*   **Chat Wallpapers**: Users can customize the background of their chat screens with custom images.
*   **Full Image Viewer**: Click on any media or profile picture to open an immersive, dark-mode overlay to view the image in high resolution or play video seamlessly.
*   **Responsive Layout**: Adapts cleanly whether viewed on a desktop browser or as a packaged Android APK via Capacitor.
*   **Dynamic Typing Area**: A clean chat footer that expands intelligently to accommodate multi-line text and attachments without breaking the layout.
*   **Visual Trust Indicators**: System alerts, "End-to-End Encryption" banners, and empty-state placeholders designed to build user trust.

### 8. 🛡️ Advanced Security & Moderation Tools
*   **Message Reporting Engine**: Users can flag specific group messages for inappropriate content. Admins have a dedicated moderation dashboard to review, dismiss, or action these reports.
*   **Request Account Info**: GDPR-compliant feature allowing users to request a complete export of their account data. The backend compiles a comprehensive report and notifies the user when the file is ready for download.

### 9. 👑 Super Admin Dashboard (ایڈمنسٹریٹر پینل)
*   **Global Announcements**: Super Admins can instantly broadcast a mass "Global Announcement" message to every single registered user on the platform simultaneously.
*   **Platform Analytics**: Live statistics tracking total users, total messages sent, and currently online users.
*   **User Management**: Admins can upgrade standard users to 'Admin' roles or permanently delete user accounts from the platform.
*   **Platform Wipe**: A 'Danger Zone' tool allowing Super Admins to clear all chats platform-wide if necessary.

### 10. 🤖 AI Integration & Community Hub (کمیونٹی اور اے آئی)
*   **AI Chat Wallpapers**: Integrated with `pollinations.ai`, users can type a text prompt to instantly generate custom AI wallpapers for their chat backgrounds.
*   **Community Hub / Gamification**: A dedicated section displaying the App's Product Roadmap, Community Discussion threads, and a Leaderboard that ranks Top Contributors with gamified points and badges.

### 11. 🕰️ Scheduled Messaging (شیڈول میسجنگ)
*   **Automated Dispatch**: Users can compose messages and schedule them to be sent automatically at a future date and time using backend Cron jobs.
*   **Status Tracking**: Scheduled messages are tracked seamlessly (Pending, Sent, or Failed).

---

## 📂 Database Schema Overview (ڈیٹا بیس سٹرکچر)

*   **`User`**: Stores credentials, `bcrypt` hashed passwords, display name, profile picture GridFS references, phone number, and individual settings (muted/blocked contacts).
*   **`Message`**: Stores content payloads, sender/recipient/group IDs, timestamps, delivery statuses, and `fileMetadata` for GridFS chunks.
*   **`Group`**: Manages member arrays, admin role lists, group icons, and specialized group settings (like Slow Mode and Disappearing timers).
*   **`Call`**: Stores the initiator (`caller`) and a dynamic array of `participants` to accurately reflect multi-party logs. Includes call duration and status.
*   **`Story`**: Handles ephemeral media uploads, media type definitions, and tracks viewer arrays for the 24-hour cycle.
*   **`Report`**: Manages user-generated flags on inappropriate content (`reporterId`, `reportedMessageId`, `reason`, `status`).
*   **`AccountReport`**: Manages the lifecycle of GDPR data exports (`user`, `status`, `fileId`, `expiresAt`).
*   **`ScheduledMessage`**: Stores future message dispatches (`executeAt`, `content`, `groupId`, `status`).

---

*This exhaustive document reflects the immense scale of full-stack engineering, custom UI/UX design, and complex real-time networking achieved in the ZapChat project.*
