/** @namespace */
var chat = {
    /**
     * Refer to this by {@link chat."#channel"}.
     * @namespace
     */
    "#channel": {
        /**
         * Refer to this by {@link chat."#channel".open}.
         * @type {boolean}
         * @defaultvalue
         */
        open: true,
        /**
         * Internal quotes have to be escaped by backslash. This is
         * {@link chat."#channel"."say-\"hello\""}.
         */
        'say-"hello"': function (msg) {},
        /**
         * My method is great  
         */
        myMethod : function() {}
    }
};

/**
 * Now we define an event in our {@link chat."#channel"} namespace.
 * @event chat."#channel"."op:announce-motd"
 */