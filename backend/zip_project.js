const fs = require('fs');
const path = require('path');
const { ZipArchive } = require('archiver');

const projectRoot = path.join(__dirname, '..');
const outputZip = path.join(projectRoot, 'project_backup.zip');
const output = fs.createWriteStream(outputZip);
const archive = new ZipArchive({
    zlib: { level: 9 }
});

output.on('close', function() {
    console.log(`Successfully zipped! Total bytes: ${archive.pointer()}`);
    console.log(`File saved to: ${outputZip}`);
});

archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
        console.warn('Warning:', err);
    } else {
        throw err;
    }
});

archive.on('error', function(err) {
    throw err;
});

archive.pipe(output);

function shouldIgnore(name) {
    const ignoreList = [
        'node_modules',
        'dist',
        '.git',
        '.vscode',
        'project_backup.zip',
        '.gemini',
        'scratch',
        '.system_generated'
    ];
    return ignoreList.includes(name);
}

const items = fs.readdirSync(projectRoot);

items.forEach(item => {
    if (shouldIgnore(item)) {
        return;
    }
    const itemPath = path.join(projectRoot, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
        archive.directory(itemPath, item, (entry) => {
            const relativePath = entry.name;
            const parts = relativePath.split(/[/\\]/);
            if (parts.some(part => shouldIgnore(part))) {
                return false;
            }
            return entry;
        });
    } else {
        archive.file(itemPath, { name: item });
    }
});

archive.finalize();
