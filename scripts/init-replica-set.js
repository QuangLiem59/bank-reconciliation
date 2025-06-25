print('🚀 Starting replica set initialization...');

try {
    // Check if replica set is already initialized
    let isInitialized = false;
    try {
        const status = rs.status();
        print('ℹ️  Replica set already exists:', status.set);
        isInitialized = true;
    } catch (e) {
        if (
            e.message.includes('no replset config') ||
            e.message.includes('not running with --replSet')
        ) {
            print(
                '📝 Replica set not initialized yet, proceeding with initialization...',
            );
        } else {
            throw e;
        }
    }

    if (!isInitialized) {
        // Initialize replica set
        const config = {
            _id: 'rs0',
            version: 1,
            members: [
                { _id: 0, host: 'mongodb1:27017', priority: 3 },
                { _id: 1, host: 'mongodb2:27017', priority: 2 },
                { _id: 2, host: 'mongodb3:27017', priority: 1 },
            ],
        };

        print(
            '🔧 Initiating replica set with config:',
            JSON.stringify(config, null, 2),
        );
        const result = rs.initiate(config);
        print('📋 Initiation result:', JSON.stringify(result));

        if (result.ok !== 1) {
            throw new Error(
                'Failed to initiate replica set: ' + JSON.stringify(result),
            );
        }

        // Wait for replica set to stabilize
        print('⏳ Waiting for replica set to stabilize...');
        let attempts = 0;
        const maxAttempts = 60; // 2 minutes max wait time

        while (attempts < maxAttempts) {
            try {
                const status = rs.status();
                const primary = status.members.find((m) => m.stateStr === 'PRIMARY');
                const allHealthy = status.members.every((m) => m.health === 1);

                if (primary && allHealthy) {
                    print('✅ Replica set is ready!');
                    print('🎯 Primary node:', primary.name);
                    print('📊 Member status:');
                    status.members.forEach((member) => {
                        print(
                            `   - ${member.name}: ${member.stateStr} (health: ${member.health})`,
                        );
                    });
                    break;
                }

                print(
                    `⏱️  Waiting for stability... attempt ${attempts + 1}/${maxAttempts}`,
                );
            } catch (e) {
                print(
                    `⏱️  Replica set not ready yet... attempt ${attempts + 1}/${maxAttempts}`,
                );
            }

            sleep(2000); // Wait 2 seconds
            attempts++;
        }

        if (attempts >= maxAttempts) {
            throw new Error(
                '❌ Replica set failed to stabilize within expected time',
            );
        }
    }

    // Final status check
    const finalStatus = rs.status();
    print('🎉 Replica set initialization completed successfully!');
    print(
        '📈 Final status:',
        finalStatus.set,
        'with',
        finalStatus.members.length,
        'members',
    );
} catch (error) {
    print('❌ Error during replica set initialization:', error.message);
    throw error;
}
