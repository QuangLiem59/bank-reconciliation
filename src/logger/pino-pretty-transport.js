/* eslint-disable */
const pinoPretty = require('pino-pretty');

module.exports = function pinoPrettyTransport(opts) {
    return pinoPretty({
        ...opts,
        messageFormat: (log) => {
            // Check if this is an HTTP request log
            if (log.req || (log.method && log.path)) {
                const method = log.method || (log.req && log.req.method);
                const path = log.path || (log.req && log.req.path) || (log.req && log.req.url);
                const statusCode = log.statusCode || (log.req && log.req.statusCode) || (log.res && log.res.statusCode);
                const responseMsg = log.responseMsg || (log.req && log.req.responseMsg) || (log.res && log.res.responseMsg);
                const errMsg = log.errMsg || (log.req && log.req.errMsg) || (log.err && log.err.message);

                // Different background colors for HTTP methods with padding
                let methodColor;
                switch (method) {
                    case 'GET':
                        methodColor = '\x1b[97;44m'; // White text on blue background
                        break;
                    case 'POST':
                        methodColor = '\x1b[97;42m'; // White text on green background
                        break;
                    case 'PUT':
                        methodColor = '\x1b[97;43m'; // White text on yellow background
                        break;
                    case 'DELETE':
                        methodColor = '\x1b[97;41m'; // White text on red background
                        break;
                    case 'PATCH':
                        methodColor = '\x1b[97;45m'; // White text on magenta background
                        break;
                    default:
                        methodColor = '\x1b[97;100m'; // White text on gray background
                }

                // Format method with padding to ensure consistent width
                const formattedMethod = ` ${method} `;

                // Path with info (cyan) color
                const pathColor = '\x1b[36m'; // Cyan

                // Handle undefined statusCode
                const safeStatusCode = statusCode !== undefined ? statusCode : 'pending';

                // Status code with different colors based on code
                let statusColor;
                if (safeStatusCode === 'pending') {
                    statusColor = '\x1b[90m'; // Gray for pending/undefined
                } else if (safeStatusCode < 300) {
                    statusColor = '\x1b[32m'; // Green for 2xx (success)
                } else if (safeStatusCode < 400) {
                    statusColor = '\x1b[36m'; // Cyan for 3xx (redirect)
                } else if (safeStatusCode < 500) {
                    statusColor = '\x1b[33m'; // Yellow for 4xx (client error)
                } else {
                    statusColor = '\x1b[31m'; // Red for 5xx (server error)
                }

                // Handle undefined responseMsg
                const safeResponseMsg = responseMsg !== undefined ? responseMsg : 'In Progress';

                // Message color based on status
                let msgColor;
                if (safeStatusCode === 'pending') {
                    msgColor = '\x1b[90m'; // Gray for pending/undefined
                } else if (safeStatusCode < 300) {
                    msgColor = '\x1b[36m'; // Cyan for success
                } else if (safeStatusCode < 400) {
                    msgColor = '\x1b[36m'; // Cyan for redirects
                } else if (safeStatusCode < 500) {
                    msgColor = '\x1b[33m'; // Yellow for client errors
                } else {
                    msgColor = '\x1b[31m'; // Red for server errors
                }

                const reset = '\x1b[0m';

                // Handle undefined errors
                const safeErrMsg = errMsg === undefined ? '' : errMsg;

                const arrow = "->";

                return `${methodColor}${formattedMethod}${reset} ${pathColor}${path}${reset} ${arrow} ${statusColor}${safeStatusCode}${reset} ${msgColor}"${safeResponseMsg}"${reset} ${safeErrMsg ? `\x1b[31m${safeErrMsg}\x1b[0m` : ''}`;
            }
            return `${log.level} ${log.msg}`;
        },
    });
};