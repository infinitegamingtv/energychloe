# Exporting and Embedding into ClassIn (.edu File)

ClassIn supports embedding web applications via `.edu` files (which act as a wrapper) or by directly sharing a web link. Here is how to package and use this game in a ClassIn virtual classroom.

## Method 1: Using the ClassIn Web Browser Tool (Recommended)
Since this game relies on an internet connection to communicate with Firebase, the easiest way to use it in ClassIn is:

1. Host your folder on a web server (e.g., GitHub Pages, Netlify, Vercel). This is free and takes just a few clicks.
2. In your ClassIn virtual classroom, click the **Toolbox** icon.
3. Select **Browser** (or Web Browser).
4. Enter the URL of your hosted game.
5. The game container is already programmed to maintain a strict 4:3 aspect ratio, so when you resize the browser window in ClassIn, the game will automatically scale to fit perfectly without any scrollbars.
6. Share the URL with your students, or use the "Send to all" feature if your ClassIn version supports pushing the browser to students.

## Method 2: Packaging as an .edu Resource
If you need to strictly use the `.edu` format for offline/local storage inside ClassIn's drive (note: students will still need internet access for Firebase Realtime Database):

1. **Zip the Project**: Select `index.html`, `style.css`, and `script.js` and compress them into a `.zip` file (e.g., `chloe_game.zip`). Ensure `index.html` is at the root of the zip, not inside a subfolder.
2. **Rename Extension**: Rename the file from `chloe_game.zip` to `chloe_game.edu`.
3. **Upload to ClassIn**: Open your ClassIn Drive (Cloud Disk) and upload the `.edu` file.
4. **Open in Class**: During your class, simply click on the `.edu` file from your Cloud Disk. ClassIn will automatically extract it and run `index.html` in an embedded 4:3 window.

*Because we used CSS `aspect-ratio: 4/3` and `max-width / max-height` viewport constraints, the game will automatically format perfectly to the `.edu` player window!*
