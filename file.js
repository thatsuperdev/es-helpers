const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
var localGit;
const defCB = function (err, result) {
    console.log('Def CB: '+(err ?'Error: ' :'Success: '), err || result);
};
var localFile = {
    fs: fs,
    saveToJSON: function (filename, content, callback) {
        content = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        filename = filename.match(/\.json$/) ? filename : filename + '.json';
        fs.mkdir(path.dirname(path.resolve(filename)), { recursive: true }, function (err) {
            if (err) return (callback || defCB)(err);
            fs.writeFile(filename, content, callback || defCB);
        });
    },
    getStoredJSON: function (filename, callback) {
        filename = filename.match(/\.json$/) ? filename : filename + '.json';
        fs.readFile(filename, 'utf-8', function (err, content) {
            err && console.log(`Error in reading file "${filename}":`, err.toString());
            if(err) return callback(err);
            try {
                content = JSON.parse(content);
                callback(null, content);
            } catch(e) {
                console.log('Error in parsing JSON: ', e.message, content);
                callback(typeof content=='string' && e, content);
            }
        });
    },
    pathExists: function(path, callback) {
        fs.stat(path, (err, result) => {
            if(err) {
                if(err.code==='ENOENT') {
                    err.code = 'INVALID_PATH';
                }
                else if(['EPIPE'].indexOf(err.code)>=0) {
                    err.code = 'INVALID_FILE';
                }
                return callback(err);
            }
            callback(null, result);
        });
    },
    copyFile: function (src, dest, callback) {
        fs.cp(src, dest, {recursive: true, force: true}, callback || defCB);
    },
    copyRemoteFile: function (remoteFile, localPath, callback) {
        const done = callback || defCB;
        fs.mkdir(path.dirname(path.resolve(localPath)), { recursive: true }, function (err) {
            if (err) return done(err);
            fetch(remoteFile)
                .then(response => {
                    if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}`);
                    return pipeline(Readable.fromWeb(response.body), fs.createWriteStream(localPath));
                })
                .then(() => done(null, true))
                .catch(done);
        });
    },
    copyDirRecursive: function (src, dest, options, callback) {
        options = options || {};
        fs.cp(src, dest, {
            recursive: true,
            force: options.overWrite !== false,
            errorOnExist: options.overWrite === false,
            dereference: options.followSymlink === true,
            filter: options.filter,
        }, function (err) {
            if (err) {
                console.error("Error in copying directory", err);
                return callback(err);
            }
            console.log('Copied directory successfully!');
            callback(null, true)
        });
        return this;
    },

    replaceContentIn: function (filePath, replaceWith, callback) {
        fs.readFile(filePath, function (err, data) {
            if (err) {
                console.log('Error in reading file:', err);
                return callback(err);
            }
            if (typeof replaceWith == 'function')
                data = replaceWith(data);
            else
                data = replaceWith;
            fs.writeFile(filePath, data, function (err) {
                if (err)
                    console.error("Error in writing file:", err);
                callback(err, true);
            })
        });
        return this;
    },
    removeDir: function (path) {
        fs.rm(path, { recursive: true, force: true }, function (err) {
            if (err) console.error('Error in deleting directory:', err);
        });
        return this;
    },
    removeFile: function (filepath, callback) {
        try {
            fs.unlink(filepath, function (err) {
                if (err && err.code == 'ENOENT') {
                    // file doesn't exist
                    console.info("File doesn't exist, won't remove it.");
                } else if (err) {
                    // maybe we don't have enough permission
                    console.error("Error in deleting file %s:", filepath, err);
                } else {
                    console.log('Deleted file %s', filepath)
                }
                callback ? callback(err) : err;
            });
        }
        catch (e) {
            console.log("Error in deleting file %s: ", filepath, e);
            callback ? callback(e) : false;
        }
        return this;
    },
    zipFolder: function (options, callback) {
        var source = options.src;
        var dest = options.dest || options.src;
        var basePath = options.basePath || __dirname + '/../';

        dest = dest[0] == '.' ? basePath + dest : dest;
        dest = dest.replace(/\\/g, '/');
        source = source[0] == '.' ? basePath + source : source;
        source = source.replace(/\\/g, '/');
        var folderName = source.split('/').pop();
        options = {
            excludeParentFolder: true, //Default : false. if true, the content will be zipped excluding parent folder.
            parentFolderName: folderName //if specified, the content will be zipped, within the 'v1.0' folder
        };
        var FolderZip = require('folder-zip');
        //zip a folder and change folder destination name
        var zip = new FolderZip();
        zip.zipFolder(source, options, function () {
            zip.writeToFile(dest, function () {
                callback(null, dest);
            });
        });
        return this;
    },
    git: function (baseDir) {
        localGit = localGit || require('./git');
        baseDir = baseDir || global.__repos || process.cwd();
        return {
            pull: localGit.simplePull,
            clone: function (repoPath, callback) {
                const cloneDir = require('path').join(baseDir, repoPath.split('/').pop().replace(/#/g, '-').replace(/\.git/, ''));
                const options = {
                    dest: cloneDir
                };
                fs.mkdir(cloneDir, { recursive: true }, function (err) {
                    if(!err) {
                        console.log('created directory:', cloneDir);
                        localGit.cloneRepo(repoPath, options, callback);
                        return;
                    }
                    console.log('FAILED to create directory:', err);
                    callback && callback(err);
                })
            },
            sync: function (repoPath, callback) {
                const cloneDir = require('path').join(baseDir, repoPath.split('/').pop().replace(/#/g, '-').replace(/\.git/, ''));
                fs.existsSync(cloneDir) ?this.pull(cloneDir, (err, result) => {
                    !err && console.log("Pulled %s, instead of cloning: ", repoPath, result);
                    err && console.log("Error in pulling:", err);
                    callback(err, cloneDir);
                }) :this.clone(repoPath, callback);
            }
        }
    }
};
module.exports = localFile;
