actor {
    public query (msg) func whoami() : async Principal {
        msg.caller
    };
};
