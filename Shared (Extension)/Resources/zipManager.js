// CRC32 lookup table for ZIP file checksum calculation
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    crcTable[i] = c;
}

class ZipManager {
    static downloadAllFiles(files) {
        if (files.size === 0) return;
    
        const zipData = [];
        let centralDirectory = [];
        let offset = 0;
    
        // Process each file
        Array.from(files.entries()).forEach(([name, content]) => {
            const encoder = new TextEncoder();
            const data = encoder.encode(content);
            const nameBytes = encoder.encode(name);
    
            // Calculate CRC32
            let crc = 0xFFFFFFFF;
            for (let i = 0; i < data.length; i++) {
                crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xFF];
            }
            crc = (crc ^ 0xFFFFFFFF) >>> 0;
    
            // Get current date and time
            const date = new Date();
            const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
            const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    
            // Local file header
            const header = new Uint8Array(30 + nameBytes.length);
            const headerView = new DataView(header.buffer);
            
            // Local file header signature
            headerView.setUint32(0, 0x04034b50, true);
            headerView.setUint16(4, 0x0014, true); // Version needed to extract (2.0)
            headerView.setUint16(6, 0, true);  // General purpose bit flag
            headerView.setUint16(8, 0, true);  // Compression method (none)
            headerView.setUint16(10, dosTime, true); // File last modification time
            headerView.setUint16(12, dosDate, true); // File last modification date
            headerView.setUint32(14, crc, true); // CRC-32
            headerView.setUint32(18, data.length, true); // Compressed size
            headerView.setUint32(22, data.length, true); // Uncompressed size
            headerView.setUint16(26, nameBytes.length, true); // File name length
            headerView.setUint16(28, 0, true); // Extra field length
            
            // Add filename
            header.set(nameBytes, 30);
    
            // Central directory header
            const centralHeader = new Uint8Array(46 + nameBytes.length);
            const centralHeaderView = new DataView(centralHeader.buffer);
            
            // Central directory header signature
            centralHeaderView.setUint32(0, 0x02014b50, true);
            centralHeaderView.setUint16(4, 0x0014, true); // Version made by
            centralHeaderView.setUint16(6, 0x0014, true); // Version needed to extract
            centralHeaderView.setUint16(8, 0, true);  // General purpose bit flag
            centralHeaderView.setUint16(10, 0, true); // Compression method
            centralHeaderView.setUint16(12, dosTime, true); // File last modification time
            centralHeaderView.setUint16(14, dosDate, true); // File last modification date
            centralHeaderView.setUint32(16, crc, true); // CRC-32
            centralHeaderView.setUint32(20, data.length, true); // Compressed size
            centralHeaderView.setUint32(24, data.length, true); // Uncompressed size
            centralHeaderView.setUint16(28, nameBytes.length, true); // File name length
            centralHeaderView.setUint16(30, 0, true); // Extra field length
            centralHeaderView.setUint16(32, 0, true); // File comment length
            centralHeaderView.setUint16(34, 0, true); // Disk number start
            centralHeaderView.setUint16(36, 0, true); // Internal file attributes
            centralHeaderView.setUint32(38, 0, true); // External file attributes
            centralHeaderView.setUint32(42, offset, true); // Relative offset of local header
            
            // Add filename to central directory
            centralHeader.set(nameBytes, 46);
    
            zipData.push(header);
            zipData.push(data);
            centralDirectory.push(centralHeader);
    
            offset += header.length + data.length;
        });
    
        // End of central directory record
        const endOfCentralDir = new Uint8Array(22);
        const endView = new DataView(endOfCentralDir.buffer);
        const centralDirSize = centralDirectory.reduce((sum, header) => sum + header.length, 0);
        
        endView.setUint32(0, 0x06054b50, true); // End of central dir signature
        endView.setUint16(4, 0, true); // Number of this disk
        endView.setUint16(6, 0, true); // Disk where central directory starts
        endView.setUint16(8, files.size, true); // Number of central directory records on this disk
        endView.setUint16(10, files.size, true); // Total number of central directory records
        endView.setUint32(12, centralDirSize, true); // Size of central directory
        endView.setUint32(16, offset, true); // Offset of start of central directory
        endView.setUint16(20, 0, true); // Comment length
    
        // Combine all parts
        const allData = [...zipData, ...centralDirectory, endOfCentralDir];
        
        // Create and download the ZIP file
        const blob = new Blob(allData, { type: 'application/zip' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'files.zip';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
    
    static downloadAllWorkspaceFiles(workspaceFiles) {
        if (!workspaceFiles || Object.keys(workspaceFiles).length === 0) return;
        
        const zip = new JSZip();
        
        for (const [workspace, files] of Object.entries(workspaceFiles)) {
            const folder = zip.folder(workspace);
            for (const [name, content] of Object.entries(files)) {
                folder.file(name, content);
            }
        }
        
        zip.generateAsync({ type: 'blob' })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'ai-chat-flow-all-workspaces.zip';
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            });
    }
}