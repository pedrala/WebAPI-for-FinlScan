module.exports = {
    apps: [{
        name: 'webApi',
        script: './bin/www',
        watch: ['server', 'client'],
        watch_delay: 1000,
        ignore_watch: ['node_modules', 'client/img'],
        instances: 0,
        exec_mode: 'cluster'
    }]
};
