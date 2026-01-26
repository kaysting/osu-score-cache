module.exports = {
    apps: [
        {
            name: 'osc',
            script: 'npm',
            args: 'start',
            watch: [
                'web/*.js', '.env', 'web/*.js', 'lib/*.js', 'config/*.js'
            ],
            max_memory_restart: '2G'
        }
    ]
};