const path = require('path');
var localGit = {
    simplePull: function (workingDir, callback) {
        const git = require('simple-git')(workingDir);
        git.pull(function (err, update) {
            if (err) {
                console.error("Error in git pull:\r", err);
                return callback(err);
            }
            console.log("Git pull success:", update);
            callback(null, update);
        })
    },
    commitFile: function (filePath, message, options, callback) {
        var files = typeof filePath === 'string' ? [filePath] : filePath;
        if (callback === undefined && typeof options === 'function') {
            callback = options;
            options = {};
        }
        const basePath = options && options.baseDir ? options.baseDir : process.cwd();
        const commitOptions = { ...(options || {}) };
        delete commitOptions.baseDir;
        const git = require('simple-git');
        git(basePath).commit(message, files, commitOptions, function (err, result) {
            console.log("Commit result:", err, result);
            if (!err) {
                if (result && result.commit) {
                    git(basePath).push();
                    callback ? callback(err, result) : null;
                }
                else {
                    callback ? callback(err, result) : null;
                }
            }
            else {
                callback ? callback(err, result) : null;
            }
        });
    },
    cloneRepo: function (repoPath, options, callback) {
        options = options || {};
        const url = repoPath.split('#')[0];
        const branchName = repoPath.split('#')[1] || null;
        const cloneTo = options.dest || path.resolve(process.cwd(), String(Date.now()));
        const args = branchName ? ['--branch', branchName, '--single-branch'] : [];
        require('simple-git')().clone(url, cloneTo, args, function (err) {
            return callback && callback(err, cloneTo);
        });
    }
};
module.exports = localGit;
