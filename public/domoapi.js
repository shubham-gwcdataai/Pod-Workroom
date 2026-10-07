(function attachDomoApi(globalScope) {
    var api = {
        getDomo: async function getDomo() {
            if (!globalScope.domo) {
                throw new Error('Domo API is not available.');
            }
            return globalScope.domo;
        },
        waitForUser: async function waitForUser(getDomo) {
            var deadline = Date.now() + 10000;
            var domoInstance;
            while (Date.now() < deadline) {
                try {
                    domoInstance = await getDomo();
                    var email = domoInstance.env && domoInstance.env.userEmail;
                    if (email && email.trim()) return email.trim().toLowerCase();
                } catch {
                    // The Domo runtime is loaded by the platform before this helper runs.
                }
                await new Promise(function resolveTimer(resolve) {
                    globalScope.setTimeout(resolve, 100);
                });
            }
            try {
                domoInstance = await getDomo();
                return domoInstance.env && domoInstance.env.userEmail
                    ? domoInstance.env.userEmail.trim().toLowerCase()
                    : '';
            } catch {
                return '';
            }
        },
    };

    globalScope.domoApi = api;
})(window);
