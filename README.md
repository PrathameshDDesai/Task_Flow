# Productivity Task Tracker

A modularized version of the task tracking application with Firebase integration.

## 📁 Project Structure
- `index.html`: The main user interface.
- `css/style.css`: All application styles.
- `js/app.js`: Core application logic (Auth, Tasks, Database).

## 🚀 How to Run
1. **Open the project folder**: Ensure you are in the `task-tracker` directory.
2. **Start a local server**:
   - If you have Python: `python -m http.server 8000`
   - If you have Node.js: `npx http-server`
3. **Open in Browser**: Visit `http://localhost:8000` (or the port specified by your server).
4. **Login/Register**: Use the authentication box to start tracking tasks.

## 🗄️ Database (Firestore)
The app uses Firebase Firestore to store data.
- **Users**: Profile info and global stats.
- **Tasks**: User-specific tasks stored as sub-collections.
- **Real-time**: The app fetches data directly from the cloud.

## 💡 Troubleshooting
- **Buttons not working**: Ensure `js/app.js` is correctly linked in `index.html`.
- **Firebase Errors**: Ensure your device has internet access to connect to the Firebase CDN and database.
