const express = require('express');
const router = express.Router();
const joinPath = require('path').join;
const getExtension = require('path').extname;
const fs = require('fs');
const promisify = require('util').promisify;
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const pas = require('../pas/pasRequest');
const config = require('../config/loadConfig');

// 1. GET ROUTE: Render the initial page structure
router.get('/', async (req, res) => {
  try {
    // Determine the path to the documents folder
    const docsDirectory = joinPath(__dirname, '..', 'documents');
    
    // Read all files in the directory
    const allFiles = await readdir(docsDirectory);

    // Define the extensions you want to allow
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.tif', '.tiff', '.png', '.jpg'];

    // Filter the array to only include files with allowed extensions
    const availableDocuments = allFiles.filter(file => {
      const extension = getExtension(file).toLowerCase();
      return allowedExtensions.includes(extension);
    });

    res.setHeader('Content-Security-Policy', 'script-src \'self\' \'nonce-abc123\'; worker-src blob:');
    
    // Pass the filtered array to the Handlebars template
    res.render('index', {
      title: 'PrizmDoc Document Selector',
      documents: availableDocuments 
    });

  } catch (err) {
    console.error("Failed to read documents directory:", err);
    res.status(500).send("Internal Server Error loading documents.");
  }
});

// 2. POST ROUTE: Generate a viewing session dynamically
router.post('/create-session', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const fileName = req.body.fileName;
    if (!fileName) {
        return res.status(400).json({ error: 'fileName is required' });
    }

    let clientFileFormats = [];
    if (config.enableClientSideViewing == true) {
      clientFileFormats = ['pdf'];
    }

    // Step A: Create a new viewing session telling PAS what file to expect
    const prizmdocRes = await pas.post('/ViewingSession', { 
      json: {
        source: {
          type: 'upload',
          displayName: fileName
        },
        allowedClientFileFormats: clientFileFormats
      }
    });
    
    const viewingSessionId = prizmdocRes.body.viewingSessionId;

    // Step B: Send the ID back to the browser immediately so the UI can update
    res.json({ viewingSessionId: viewingSessionId });

    // Step C: Upload the actual source document to PrizmDoc in the background
    await pas.put(`/ViewingSession/u${viewingSessionId}/SourceFile`, {
      body: await readFileFromDocumentsDirectory(fileName)
    });

  } catch (error) {
    console.error("Error creating viewing session:", error);
    res.status(500).json({ error: 'Failed to create viewing session' });
  }
});

// Util function to read a document from the documents/ directory
async function readFileFromDocumentsDirectory(filename) {
  return readFile(joinPath(__dirname, '..', 'documents', filename));
}

module.exports = router;