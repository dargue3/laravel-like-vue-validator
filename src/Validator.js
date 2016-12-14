/**
 * Validator mixin inspired by Laravel's Validator API
 *
 * https://github.com/dargue3/laravel-like-vue-validator
 */
export default
{
	data()
	{
		return {
			errors: {},
			validator_: {
				vars: {},
				errMsg: {},
				watching: {},
				validRules: {
					required: 	function(args) { return this.required_(args) },	// the field needs to have something in it
					max: 				function(args) { return this.max_(args) }, 		// the field must be less than a given argument in length or size
					min: 				function(args) { return this.min_(args) }, 		// the field must be greater than a given argument in length or size
					size: 			function(args) { return this.size_(args) }, 	// the field must be of a given size in length or value
					equals: 		function(args) { return this.equals_(args) }, 	// the field must equal to a given value
					in: 				function(args) { return this.in_(args) }, 		// the field must equal one of the given arguments
					boolean: 		function(args) { return this.boolean_(args) },  // the field must be a boolean
					string: 		function(args) { return this.string_(args) },  	// the field must be a string
					number: 		function(args) { return this.number_(args) },  	// the field must be a number
					array: 			function(args) { return this.array_(args) },  	// the field must be an array
					regex: 			function(args) { return this.regex_(args) },  	// the field must be a string that matches a given regular expression. BE CAREFUL, DON'T INCLUDE PIPES! 
					alpha_num: 	function(args) { return this.alphaNum_(args) },  // the field must be a string with only alphanumeric characters
					alpha_dash: function(args) { return this.alphaDash_(args) },  // the field must be a string with only alphanumeric characters and dashes + underscores
					email: 			function(args) { return this.email_(args) }, 	// the field must be a valid email
				},
				value: null, 				// the value of the variable in question
				path: null, 				// the full path of the variable (e.g. user.name.firstname)
				root: null, 				// the name of the root of the variable (e.g. user)
				key: null,					// string of keys off of the root variable that make up the full path
				rules: null, 				// the rules applied to this variable
				messages: null, 		// the error messages to set
				count: null,				// the index into the array counter
				isArray: null,			// whether or not the given variable is an array
				arraySize: null, 		// how many indices to initialize errors array with for a given variable
				arrayIndex: null,		// which index of the given array to error check
				temp: {}, 					// temporary useless variable to utilize $set functionality
			}
		}
	},

	methods:
	{
		/**
		 * Register a given variable for error checking against given rules
		 * 
		 * @param {string} variable The variable being registered for error checking		
		 * @param {string} rules    Rules that should be applied to the variable
		 * @param {array} messages  Error messages (can be up to one-to-one with rules or less)
		 * @param {boolean} watch  	Whether or not to run error checking when the variable changes
		 * @param {int} arraySize   How many indices in errors.{} that should be created initially
		 * @return {void} 
		 */
		registerErrorChecking(variable, rules, messages = [], watch = true, arraySize = null)
		{
			this.validator_.path = variable;
			this.validator_.root = variable;
			this.validator_.rules = rules;
			this.validator_.messages = messages;
			this.validator_.count = 0;
			this.validator_.isArray = false;
			this.validator_.key = '';

			// variable could have various indices beyond just the root
			// split into an array for ease
			variable = variable.split('.');

			if (variable.length > 1) {

				this.validator_.root = variable[0];

				if (variable[1] === '*') {
					// dealing with an array
					this.validator_.isArray = true;
					this.validator_.path = this.validator_.root;
					this.validator_.arraySize = arraySize;
					this.validator_.key = ''

					if (variable.length > 2) {
						// variable looks like 'players.*.name.firstname', save those extra keys
						this.validator_.key = variable.slice(2).join('.');
						this.validator_.path = this.validator_.root + '.' + this.validator_.key;
					}
				}
				else {
					// variable looks like 'player.name'
					this.validator_.key = variable.slice(1).join('.');
					this.validator_.path = this.validator_.root + '.' + this.validator_.key;
				}
			}

			this.register_();

			if (watch && ! this.validator_.isArray) {
				// whenever this variable changes, re-run the error check
				var path = this.validator_.path;
				this.validator_.watching[path] = this.$watch(path, function() { this.errorCheck(path); });
			}
		},


		/**
		 * Register the saved attributes for error checking
		 *
		 * @return {void}
		 */
		register_()
		{
			if (typeof this.validator_.vars[this.validator_.root] === 'undefined') {
				// new entry
				this.$set('validator_.vars.' + this.validator_.root, {
					rules: [this.addRules()],
					isArray: this.validator_.isArray,
					keys: [this.validator_.key]
				});
			}
			else {
				// add these rules
				if (this.checkForConflicts()) {
					return;
				}
				this.validator_.vars[this.validator_.root].rules.push(this.addRules());
				this.validator_.vars[this.validator_.root].keys.push(this.validator_.key);
			}

			if (! this.validator_.isArray) {
				// initialize errors to an empty string
				this.$set('errors.' + this.validator_.path, '');
			}
			else {
				// initialize errors to array of empty strings
				this.initializeErrorArray();
			}
		},


		/**
		 * Process for initializing errors object with array of empty strings
		 *
		 * @return {void} 
		 */
		initializeErrorArray()
		{
			this.validator_.value = this.$get(this.validator_.root);

			if (typeof this.errors[this.validator_.root] === 'undefined') {
				this.errors[this.validator_.root] = [];
			}

			this.validator_.temp = {};
			this.$set('validator_.temp.' + this.validator_.key, ''); // build a placeholder to insert


			// choose the proper length to initialize errors array to 
			if (this.validator_.arraySize) {
				// if this argument was given during registration, use that
				var length = this.validator_.arraySize;
			}
			else {
				// otherwise go with the current length of the variable itself
				var length = this.validator_.value.length
			}

			// create an error message for each index
			// like: errors.players[x].name.firstname
			for (var x = 0; x < length; x++) {
				if (typeof this.errors[this.validator_.root][x] === 'undefined') {
					// new entry
					this.errors[this.validator_.root].$set(x, this.validator_.temp);
				}
				else {
					// copy over existing content and the new 
					for (var key in this.validator_.temp) {
						this.errors[this.validator_.root][x][key] = this.validator_.temp[key];
					}
				}
			}
		},



		/**
		 * Format the rules and store for this variable
		 *
		 * @return {object}
		 */
		addRules()
		{
			var rules = {};
			this.validator_.rules = this.validator_.rules.split('|');

			for (var rule in this.validator_.rules) {
				// split rule and arguments apart (like: ['in', 'dog,cat,mouse'])
				var splitRule = this.validator_.rules[rule].split(':');
				rule = splitRule[0]; // save the rule (like: 'in');

				this.validateRule(rule);

				// save the error message for this rule
				var msg = this.getErrorMessage();
				this.$set('validator_.errMsg.' + this.validator_.path + '.' + rule, msg);
				this.validator_.count++;
 
				if (splitRule.length > 1) {
					rules[rule] = this.formatArguments(splitRule);
				}
				else {
					// attach no arguments
					rules[rule] = [];
				}
			}

			return rules;
		},


		/**
		 * Return the appropriate error message for this rule
		 *
		 * @return {string}
		 */
		getErrorMessage()
		{
			if (! this.validator_.messages.length) {
				return "Invalid input"
			}

			if (typeof this.validator_.messages === 'string') {
				return this.validator_.messages;
			}

			if (this.validator_.count >= this.validator_.messages.length) {
				// use the last given one, it probably applies for both
				return this.validator_.messages[this.validator_.messages.length - 1];
			}

			return this.validator_.messages[this.validator_.count];
		},


		/**
		 * Parse and format the arguments given with each rule
		 *
		 * @param {array} rule (looks like: ['in', 'cat,dog,mouse'])
		 * @return {array}
		 */
		formatArguments(rule)
		{
			if (rule[0] === 'regex') {
				// regex could have commas
				return rule[1];
			}
			else {
				var args = rule[1].split(','); 
			}
			for (var arg in args) {
				// if they're able to convert to integers, do so
				if (parseFloat(args[arg])) {
					args[arg] = parseFloat(args[arg]);
				}
			}

			return args;
		},


		/**
		 * Make sure the given rule is valid before assigning it
		 *
		 * @param {string} rule
		 * @return {void}
		 */
		validateRule(rule)
		{
			if(! (rule in this.validator_.validRules)) {
				if (rule === '') {
					throw "There is a trailing '|' or duplicate '||' in the rules for " + this.validator_.path;
				}
				else {
					throw "'" + rule + "' is not a valid rule";
				}
			}
		},


		/**
		 * When registering a variable whose root has already been registered,
		 * make sure there won't be conflicts with its array status
		 *
		 * @return {boolean}
		 */
		checkForConflicts()
		{
			if (this.validator_.isArray && ! this.validator_.vars[this.validator_.root].isArray) {
				throw "'" + this.validator_.path + "' was not previously registered as an array"
				return true;
			}
			else if (! this.validator_.isArray && this.validator_.vars[this.validator_.root].isArray) {
				throw "'" + this.validator_.path + "' was already saved for error checking as an array"
				return true;
			}

			return false;
		},


		/**
		 * Create errors.variable object, developer will set/clear as they see fit
		 *
		 * @param {string} variable  (like: location.city.name)
		 * @param {string} msg  Error message to set right now
		 * @return {void}
		 */
		manualErrorChecking(variable, msg = '')
		{
			this.validator_.root = variable.split('.')[0];
			if (typeof this.validator_.vars[this.validator_.root] !== 'undefined') {
				throw "Automatic error checking on '" + this.validator_.root + "' has been registered already"
				return;
			}

			this.$set('errors.' + variable, msg);
		},


		/**
		 * Run error checks on a given variable or every variable
		 *
		 * @param {string | null} variable
		 * @return {int} The number of errors detected
		 */
		errorCheck(variable = null)
		{
			var errors = 0;
			
			if (variable === null) {
				// check all
				for (variable in this.validator_.vars) {
					errors += this.errorCheckSpecific(variable);
				}
			}
			else {
				errors = this.errorCheckSpecific(variable);
			}

			return errors;
		},


		/**
		 * Refine the error check down to a specific variable, index, and/or key
		 *
		 * @param {string} variable 
		 * @return {int} The number of errors detected
		 */
		errorCheckSpecific(variable)
		{
			// split into an array
			variable = variable.split('.');
			this.validator_.root = variable[0];

			if (! this.checkRootWasRegistered()) {
				return 1;
			}

			if (this.validator_.vars[this.validator_.root].isArray) {
				return this.errorCheckArray_(variable)
			}
			else {
				this.validator_.arrayIndex = null;
			}

			if (variable.length > 1) {
				this.validator_.key = variable.splice(1).join('.');
				return this.checkSpecificKey_(this.validator_.key);
			}
			else {
				this.validator_.key = '';
				return this.checkAllKeys_();
			}
		},



		/**
		 * The variable being checked is an array, loop through its contents and check indices
		 *
		 * @param {array} variable
		 * @return {int} The number of errors detected
		 */
		errorCheckArray_(variable)
		{
			this.validator_.value = this.$get(this.validator_.root);

			if (! this.validator_.value.length) {
				// there are no values, no errors
				return 0;
			}

			// make sure this.errors is correct dimensions for an array
			this.resetErrorsArraySize_();

			// are there indices past the root variable?
			if (variable.length > 1) {

				// is it something like players.1.email?
				if (parseInt(variable[1])) {
					this.validator_.arrayIndex = parseInt(variable[1]);
					var key = variable.slice(2).join('.');
					if (! key.length) {
						// check all keys at this index
						return this.checkAllKeys_();
					}

					// a given key at this index
					return this.checkSpecificKey_(key);
				}
				else {
					// check every index of the array but at a specific key value
					return this.checkWholeArray_(variable.slice(1).join('.'));
				}
			}
			else {
				// check everything in the array
				return this.checkWholeArray_();
			}
		},


		/**
		 * Run error checks on just a specific key of the root variable
		 *
		 * @param {string} key
		 * @return {int} The number of errors detected
		 */
		checkSpecificKey_(key)
		{
			// convert key string to an index into keys array for this variable
			this.validator_.key = key;
			key = this.validator_.vars[this.validator_.root].keys.indexOf(key)
			if (key === -1) {
				throw "'" + this.validator_.key +  "' in '" + this.validator_.root + "' was never registered";
				return 1;
			}

			// build path to this variable
			if (this.validator_.vars[this.validator_.root].keys[key].length) {
				this.validator_.path = this.validator_.root + '.' + this.validator_.vars[this.validator_.root].keys[key];
			}
			else {
				this.validator_.path = this.validator_.root;
			}

			// return the result of error checking
			return this.runErrorCheckOnRules_(this.validator_.vars[this.validator_.root].rules[key]);
		},


		/**
		 * Check every index of the array
		 *
		 * @param {string | null} key
		 * @return {int} The number of errors detected
		 */
		checkWholeArray_(key = null)
		{
			var errors = 0;
			var currentVal = this.validator_.value;

			// loop through every entry in the array variable
			for (this.validator_.arrayIndex = 0; this.validator_.arrayIndex < currentVal.length; this.validator_.arrayIndex++) {
				if (! key) {
					// no given key, check them all
					errors += this.checkAllKeys_();
				}
				else {
					// check only given key every iteration
					errors += this.checkSpecificKey_(key);
				}
			}

			return errors;
		},



		/**
		 * Loop through and check all of the regsitered keys
		 *
		 * @return {int} The number of errors detected
		 */
		checkAllKeys_()
		{
			var errors = 0;
			for (var key in this.validator_.vars[this.validator_.root].keys) {
				// run a set of rules and save outcome
				errors += this.checkSpecificKey_(this.validator_.vars[this.validator_.root].keys[key]);
			}

			return errors;
		},


		/**
		 * Call every rule function bound to this variable
		 *
		 * @param {object} rules
		 */
		runErrorCheckOnRules_(rules)
		{
			var errors = 0;

			// save the value
			if (this.validator_.arrayIndex === null) {
				this.validator_.value = this.$get(this.validator_.path);
			}
			else {
				this.validator_.value = this.fetchValueOfArray();
			}

			for (var rule in rules) {
				var args = rules[rule];
				if (! this.validator_.validRules[rule].call(this, args)) {
					errors++;
					this.setError_(rule);
					break; // no sense in continuing if it has failed a check already
				}
				else {
					this.clearError_();
				}
			}

			return errors;
		},



		/**
		 * Fetch the value and path of the variable
		 */
		fetchValueOfArray(key)
		{
			if (this.validator_.key.length) {
				var splitKeys = this.validator_.key.split('.'); // split 'name.firstname' into ['name', 'firstname'];
				this.validator_.path = this.validator_.root + '.' + this.validator_.key;
				var value = this.$get(this.validator_.root)[this.validator_.arrayIndex]; // fetch the object at this array index

				for (var x = 0; x < splitKeys.length; x++) {
					// loop through indexing into the proper object
					value = value[splitKeys[x]];
				}
			}
			else {
				var value = this.$get(this.validator_.root)[this.validator_.arrayIndex];
				this.validator_.path = this.validator_.root;
			}

			return value;
		},


		/**
		 * Check that the root variable was registered for error checking
		 */
		checkRootWasRegistered()
		{
			if (! (this.validator_.root in this.validator_.vars)) {
				throw "'" + this.validator_.root + "' was never registered for error checking";
				return false;
			}

			return true;
		},


		/**
		 * Array might have grown since last checked, make sure this.errors is up-to-date in size
		 */
		resetErrorsArraySize_()
		{
			if (this.errors[this.validator_.root].length < this.validator_.value.length) {
				var temp = [];
				var copy = this.errors[this.validator_.root][0];
				for (var index = 0; index < this.validator_.value.length; index++) {
					temp.push(copy);
				}
				this.errors[this.validator_.root] = temp;
			}
		},


		/**
		 * Set the error message according to the rule that the variable has broken
		 *
		 * @param {string} rule 
		 */
		setError_(rule)
		{
			if (this.validator_.arrayIndex === null) {
				var error = this.$get('validator_.errMsg.' + this.validator_.path + '.' + rule); // fetch error message 
				this.$set('errors.' + this.validator_.path, error); // store
			}
			else {
				var error = this.$get('validator_.errMsg.' + this.validator_.path + '.' + rule); // fetch error message
				this.$set('validator_.temp', JSON.parse(JSON.stringify(this.errors[this.validator_.root][this.validator_.arrayIndex]))); // create copy
				this.$set('validator_.temp.' + this.validator_.key, error); // move error message to correct key

				this.errors[this.validator_.root].$set(this.validator_.arrayIndex, this.validator_.temp); // merge placeholder with this.errors
				this.errors = JSON.parse(JSON.stringify(this.errors)); // use this technique for reactivity
			}
		},


		/**
		 * Clear the errors for the variable
		 */
		clearError_()
		{
			if (this.validator_.arrayIndex === null) { 
				this.$set('errors.' + this.validator_.path, '');
			}
			else {
				this.validator_.temp = {};
				this.$set('validator_.temp.' + this.validator_.key, ''); // create placeholder
				for (var key in this.validator_.temp) {
					// store the contents of the placeholder, replacing only the necessary data
					this.errors[this.validator_.root][this.validator_.arrayIndex][key] = this.validator_.temp[key];
				}

				this.errors = JSON.parse(JSON.stringify(this.errors)); // use this technique for reactivity
			}
		},


		/**
		 * Get rid of any previously existing error checking logic
		 */
		resetErrorChecking()
		{
			this.validator_.vars = {};
			this.errors = {};
			this.validator_.errMsg = {};

			for (var key in this.validator_.watching) {
				// stop watching all registered variables
				this.validator_.watching[key].call();
			}

			this.validator_.watching = {};
		},


		/**
		 * Clear out (but maintain the structure of) this.errors
		 */
		clearErrors(key = null)
		{
			for (var key in this.errors) {
				if (typeof this.errors[key] === 'string') {
					this.errors[key] = '';
				}

			}
		},


		/**
		 * The given method could not give a valid answer about the error status
		 *
		 * @param {string} method
		 */
		uncertainInput(method)
		{
			throw "Having a hard time resolving '" + this.validator_.path + "' for rule '" + method + "'";

			return false;
		},


		/**
		 * The variable must have something inside it
		 */
		required_()
		{
			if (typeof this.validator_.value === 'undefined') {
				return false;
			}

			if (typeof this.validator_.value === 'number') {
				return true;
			} 

			if (typeof this.validator_.value === 'boolean') {
				return true;
			} 

			if (typeof this.validator_.value === 'string') {
				return this.validator_.value.length > 0;
			}

			return this.uncertainInput('required');
		},

		/**
		 * The variable must be greater than a given value in size or length
		 */
		max_(args)
		{
			if (typeof this.validator_.value === 'number') {
				return this.validator_.value <= args[0];
			}
			
			if (typeof this.validator_.value === 'string') {
				return this.validator_.value.length <= args[0];
			}

			if (typeof this.validator_.value === 'object') {
				return this.validator_.value.length <= args[0];
			}

			return this.uncertainInput('max');
		},


		/**
		 * The variable must be less than a given value in size or length
		 */
		min_(args)
		{
			if (typeof this.validator_.value === 'number') {
				return this.validator_.value >= args[0];
			}
			
			if (typeof this.validator_.value === 'string') {
				return this.validator_.value.length >= args[0];
			}

			if (typeof this.validator_.value === 'object') {
				return this.validator_.value.length >= args[0];
			}

			return this.uncertainInput('max');
		},


		/**
		 * The field must equal one of the given arguments
		 */
		in_(args)
		{
			if (args.indexOf(this.validator_.value) === -1) {
				return false;
			}

			return true;
		},


		/**
		 * The variable must be of a given size
		 */
		size_(args)
		{
			if (typeof this.validator_.value === 'number') {
				return this.validator_.value === args[0];
			}
			
			if (typeof this.validator_.value === 'string') {
				return this.validator_.value.length === args[0];
			}

			if (typeof this.validator_.value === 'object') {
				return this.validator_.value.length === args[0];
			}

			return this.uncertainInput('size');
		},


		/**
		 * The variable must equal a given argument
		 */
		equals_(args)
		{
			return this.validator_.value == args[0];
		},


		/**
		 * The variable must be a boolean
		 */
		boolean_()
		{
			return (typeof this.validator_.value === 'boolean');
		},


		/**
		 * The variable must be a string
		 */
		string_()
		{
			return (typeof this.validator_.value === 'string');
		},


		/**
		 * The variable must be a number
		 */
		number_()
		{
			return (typeof this.validator_.value === 'number');
		},


		/**
		 * The variable must be an array/object
		 */
		array_()
		{
			return (typeof this.validator_.value === 'object');
		},


		/**
		 * The variable must match a given regular expression
		 */
		regex_(expression)
		{
			if (! this.string_()) {
				// convert into string
				this.validator_.value = this.validator_.value.toString();
			}
			else if (! this.validator_.value.length) {
				// let 'required' rule take care of any empty variables
				return true;
			}

			if (! (expression instanceof RegExp)) {
				// the expression isn't a valid regular expression yet
				
				if (typeof expression === 'object') {
					// expression is being passed inside an array of arguments
					expression = expression[0];
				}

				if (expression[0] === '/') {
					// if the developer added their own forward-slashes at front and end, remove
					expression = expression.substring(1, expression.length - 1);
				}

				// create a valid regular expression out of the string with the 'global' flag
				expression = new RegExp(expression);
			}

			if (this.validator_.value.match(expression)) {
				return true;
			}
			else {
				return false;
			}
		},


		/**
		 * The variable must be a valid email address
		 */
		email_()
		{
			if (typeof this.validator_.value === 'string' && ! this.validator_.value.length) {
				return true
			}
			else {
				return this.regex_(/^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z]{2,10})|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i);
			}
		},


		/**
		 * The variable must be a string with only alphanumeric characters
		 */
		alphaNum_()
		{
			if (typeof this.validator_.value === 'string' && ! this.validator_.value.length) {
				return true;
			}
			else {
				return this.regex_(/^[a-zA-Z0-9]+$/);
			}
		},


		/**
		 * The variable must be a string with only alphanumeric characters also including dashes and underscores
		 */
		alphaDash_()
		{
			if (typeof this.validator_.value === 'string' && ! this.validator_.value.length) {
				return true;
			}
			else {
				return this.regex_(/^[a-zA-Z0-9_-]+$/);
			}
		},
	},
}