// Initialize IndexedDB for the extension
const DB_NAME = 'aiChatFlowDB';
const DB_VERSION = 2;
let db = null;

// Initialize the database
async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains('files')) {
                db.createObjectStore('files');
            }
            if (!db.objectStoreNames.contains('metadata')) {
                db.createObjectStore('metadata');
            }
            if (!db.objectStoreNames.contains('preferences')) {
                db.createObjectStore('preferences');
            }
            if (!db.objectStoreNames.contains('workspaces')) {
                const workspaceStore = db.createObjectStore('workspaces');
                workspaceStore.put({ name: 'default', files: [] }, 'default');
            }
        };
    });
}

// Database operations
async function getFromStore(storeName, key) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function setInStore(storeName, key, value) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(value, key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

async function deleteFromStore(storeName, key) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

// Get all items from a store
async function getAllFromStore(storeName) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

// Method to reset the database
async function resetDB() {
    try {
        // Delete the existing database
        await new Promise((resolve, reject) => {
            const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
            deleteRequest.onblocked = () => {
                console.warn('Database deletion was blocked');
                reject(new Error('Database deletion was blocked'));
            };
        });

        // Reinitialize the database
        await initDB();
        console.log('Database reset successfully');
    } catch (error) {
        console.error('Failed to reset database:', error);
    }
}

// Message handler for storage operations
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const handleStorageOperation = async () => {
        try {
            switch (request.operation) {
                case 'get':
                    const data = await getFromStore(request.store, request.key);
                    return { success: true, data };
                
                case 'set':
                    await setInStore(request.store, request.key, request.value);
                    return { success: true };
                
                case 'getAll':
                    const storeData = {};
                    const transaction = db.transaction(request.store, 'readonly');
                    const store = transaction.objectStore(request.store);
                    const cursorRequest = store.openCursor();
                    
                    await new Promise((resolve, reject) => {
                        cursorRequest.onsuccess = (event) => {
                            const cursor = event.target.result;
                            if (cursor) {
                                allData[cursor.key] = cursor.value;
                                cursor.continue();
                            } else {
                                resolve();
                            }
                        };
                        cursorRequest.onerror = () => reject(cursorRequest.error);
                    });
                    
                    return { success: true, data: allData };
                
                case 'delete':
                    await deleteFromStore(request.store, request.key);
                    return { success: true };
                
                case 'getAll':
                    const allData = await getAllFromStore(request.store);
                    return { success: true, data: allData };
                
                default:
                    return { success: false, error: 'Invalid operation' };
            }
        } catch (error) {
            console.error('Storage operation error:', error);
            return { success: false, error: error.message };
        }
    };

    // Handle storage operations
    if (request.type === 'storage') {
        handleStorageOperation().then(sendResponse);
        return true; // Will respond asynchronously
    }
});

// resetDB();

// Initialize database when background script loads
initDB().catch(error => console.error('Failed to initialize database:', error));
