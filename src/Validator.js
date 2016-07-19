/**
 * Validator mixin inspired by Laravel's Validator API
 */
export default
{
	data()
	{
		return {
			vars_: {},
			errors: {},
			errMsg_: {},
			validRules_: {
				required: 		function(args) { return this.required_(args) },		// the field needs to have something in it
				max: 			function(args) { return this.max_(args) }, 			// the field must be less than a given argument in length or size
				min: 			function(args) { return this.min_(args) }, 			// the field must be greater than a given argument in length or size
				size: 			function(args) { return this.size_(args) }, 		// the field must be of a given size in length or value
				equals: 		function(args) { return this.equals_(args) }, 		// the field must equal to a given value
				in: 			function(args) { return this.in_(args) }, 			// the field must equal one of the given arguments
				boolean: 		function(args) { return this.boolean_(args) },  	// the field must be a boolean
				string: 		function(args) { return this.string_(args) },  		// the field must be a string
				number: 		function(args) { return this.number_(args) },  		// the field must be a number
				array: 			function(args) { return this.array_(args) },  		// the field must be an array
				regex: 			function(args) { return this.regex_(args) },  		// the field must be a string that matches a given regular expression. BE CAREFUL, DON'T INCLUDE PIPES! 
				alpha_num: 		function(args) { return this.alphaNum(args) },  	// the field must be a string with only alphanumeric characters
				email: 			function(args) { return this.email_(args) }, 		// the field must be a valid email
			},
			value_: null, 		// the value of the variable in question
			path_: null, 		// the full path of the variable (e.g. user.name.firstname)
			root_: null, 		// the name of the root of the variable (e.g. user)
			key_: null,		// string of keys off of the root variable that make up the full path
			rules_: null, 		// the rules applied to this variable
			messages_: null, 	// the error messages to set
			count_: null,		// the index into the array counter
			isArray_: null,		// whether or not the given variable is an array
			arrayIndex_: null,	// which index of the given array to error check
			temp_: {}, 			// temporary useless variable to utilize $set functionality
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
		 * @return {void} 
		 */
		registerErrorChecking(variable, rules, messages = [], watch = true)
		{
			this.path_ = variable;
			this.root_ = variable;
			this.rules_ = rules;
			this.messages_ = messages;
			this.count_ = 0;
			this.isArray_ = false;
			this.key_ = '';

			// variable could have various indices beyond just the root
			// split into an array for ease
			variable = variable.split('.');

			if (variable.length > 1) {

				this.root_ = variable[0];

				if (variable[1] === '*') {
					// dealing with an array
					this.isArray_ = true;
					this.path_ = this.root_;
					this.key_ = ''

					if (variable.length > 2) {
						// variable looks like 'players.*.name.firstname', save those extra keys
						this.key_ = variable.slice(2).join('.');
						this.path_ = this.root_ + '.' + this.key_;
					}
				}
				else {
					// variable looks like 'player.name'
					this.key_ = variable.slice(1).join('.');
					this.path_ = this.root_ + '.' + this.key_;
				}
			}

			this.register_();

			if (watch) {
				// whenever this variable changes, re-run the error check
				var root_ = this.root_;
				this.$watch(this.root_, function() { this.errorCheck(root_) });
			}
		},


		/**
		 * Register the saved attributes for error checking
		 *
		 * @return {void}
		 */
		register_()
		{
			if (typeof this.vars_[this.root_] === 'undefined') {
				// new entry
				this.$set('vars_.' + this.root_, {
					rules: [this.addRules()],
					isArray: this.isArray_,
					keys: [this.key_]
				});
			}
			else {
				// add these rules
				if (this.checkForConflicts()) {
					return;
				}
				this.vars_[this.root_].rules.push(this.addRules());
				this.vars_[this.root_].keys.push(this.key_);
			}

			if (! this.isArray_) {
				// initialize errors to an empty string
				this.$set('errors.' + this.path_, '');
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
			this.value_ = this.$get(this.root_);

			if (typeof this.errors[this.root_] === 'undefined') {
				this.errors[this.root_] = [];
			}

			this.temp_ = {};
			this.$set('temp_.' + this.key_, ''); // build a placeholder to insert

			// create an error message for each index
			// like: errors.players[x].name.firstname
			for (var x = 0; x < this.value_.length; x++) {
				if (typeof this.errors[this.root_][x] === 'undefined') {
					// new entry
					this.errors[this.root_].$set(x, this.temp_);
				}
				else {
					// copy over existing content and the new 
					for (var key in this.temp_) {
						this.errors[this.root_][x][key] = this.temp_[key];
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
			this.rules_ = this.rules_.split('|');

			for (var rule in this.rules_) {
				// split rule and arguments apart (like: ['in', 'dog,cat,mouse'])
				var splitRule = this.rules_[rule].split(':');
				rule = splitRule[0]; // save the rule (like: 'in');

				this.validateRule(rule);

				// save the error message for this rule
				var msg = this.getErrorMessage();
				this.$set('errMsg_.' + this.path_ + '.' + rule, msg);
				this.count_++;
 
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
			if (! this.messages_.length) {
				return "Invalid input"
			}

			if (typeof this.messages_ === 'string') {
				return this.messages_;
			}

			if (this.count_ >= this.messages_.length) {
				// use the last given one, it probably applies for both
				return this.messages_[this.messages_.length - 1];
			}

			return this.messages_[this.count_];
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
				var args = rule[1];
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
			if(! (rule in this.validRules_)) {
				if (rule === '') {
					throw "There is a trailing '|' or duplicate '||' in the rules for " + this.path_;
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
			if (this.isArray_ && ! this.vars_[this.root_].isArray) {
				throw "'" + this.path_ + "' was not previously registered as an array"
				return true;
			}
			else if (! this.isArray_ && this.vars_[this.root_].isArray) {
				throw "'" + this.path_ + "' was already saved for error checking as an array"
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
			this.root_ = variable.split('.')[0];
			if (typeof this.vars_[this.root_] !== 'undefined') {
				throw "Automatic error checking on '" + this.root_ + "' has been registered already"
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
				for (variable in this.vars_) {
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
			this.root_ = variable[0];

			if (! this.checkRootWasRegistered()) {
				return 1;
			}

			if (this.vars_[this.root_].isArray) {
				return this.errorCheckArray_(variable)
			}
			else {
				this.arrayIndex_ = null;
			}

			if (variable.length > 1) {
				this.key_ = variable.splice(1).join('.');
				return this.checkSpecificKey_(this.key_);
			}
			else {
				this.key_ = '';
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
			this.value_ = this.$get(this.root_);

			if (! this.value_.length) {
				// there are no values, no errors
				return 0;
			}

			// make sure this.errors is correct dimensions for an array
			this.resetErrorsArraySize_();

			// are there indices past the root variable?
			if (variable.length > 1) {

				// is it something like players.1.email?
				if (parseInt(variable[1])) {
					this.arrayIndex_ = parseInt(variable[1]);
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
			this.key_ = key;
			key = this.vars_[this.root_].keys.indexOf(key)
			if (key === -1) {
				throw "'" + this.key_ +  "' in '" + this.root_ + "' was never registered";
				return 1;
			}

			// build path to this variable
			if (this.vars_[this.root_].keys[key].length) {
				this.path_ = this.root_ + '.' + this.vars_[this.root_].keys[key];
			}
			else {
				this.path_ = this.root_;
			}

			// return the result of error checking
			return this.runErrorCheckOnRules_(this.vars_[this.root_].rules[key]);
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
			var currentVal = this.value_;

			// loop through every entry in the array variable
			for (this.arrayIndex_ = 0; this.arrayIndex_ < currentVal.length; this.arrayIndex_++) {
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
			for (var key in this.vars_[this.root_].keys) {
				// run a set of rules and save outcome
				errors += this.checkSpecificKey_(this.vars_[this.root_].keys[key]);
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
			if (this.arrayIndex_ === null) {
				this.value_ = this.$get(this.path_);
			}
			else {
				this.value_ = this.fetchValueOfArray();
			}

			for (var rule in rules) {
				var args = rules[rule];
				if (! this.validRules_[rule].call(this, args)) {
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
			if (this.key_.length) {
				var splitKeys = this.key_.split('.'); // split 'name.firstname' into ['name', 'firstname'];
				this.path_ = this.root_ + '.' + this.key_;
				var value = this.$get(this.root_)[this.arrayIndex_]; // fetch the object at this array index

				for (var x = 0; x < splitKeys.length; x++) {
					// loop through indexing into the proper object
					value = value[splitKeys[x]];
				}
			}
			else {
				var value = this.$get(this.root_)[this.arrayIndex_];
				this.path_ = this.root_;
			}

			return value;
		},


		/**
		 * Check that the root variable was registered for error checking
		 */
		checkRootWasRegistered()
		{
			if (! (this.root_ in this.vars_)) {
				throw "'" + this.root_ + "' was never registered for error checking";
				return false;
			}

			return true;
		},


		/**
		 * Array might have grown since last checked, make sure this.errors is up-to-date in size
		 */
		resetErrorsArraySize_()
		{
			if (this.errors[this.root_].length !== this.value_.length) {
				var temp = [];
				var copy = this.errors[this.root_][0];
				for (var index = 0; index < this.value_.length; index++) {
					temp.push(copy);
				}
				this.errors[this.root_] = temp;
			}
		},


		/**
		 * Set the error message according to the rule that the variable has broken
		 *
		 * @param {string} rule 
		 */
		setError_(rule)
		{
			if (this.arrayIndex_ === null) {
				var error = this.$get('errMsg_.' + this.path_ + '.' + rule); // fetch error message 
				this.$set('errors.' + this.path_, error); // store
			}
			else {
				var error = this.$get('errMsg_.' + this.path_ + '.' + rule); // fetch error message
				this.$set('temp_', JSON.parse(JSON.stringify(this.errors[this.root_][this.arrayIndex_]))); // create copy
				this.$set('temp_.' + this.key_, error); // move error message to correct key

				this.errors[this.root_].$set(this.arrayIndex_, this.temp_); // merge placeholder with this.errors
			}
		},


		/**
		 * Clear the errors for the variable
		 */
		clearError_()
		{
			if (this.arrayIndex_ === null) { 
				this.$set('errors.' + this.path_, '');
			}
			else {
				this.temp_ = {};
				this.$set('temp_.' + this.key_, ''); // create placeholder
				for (var key in this.temp_) {
					// store the contents of the placeholder, replacing only the necessary data
					this.errors[this.root_][this.arrayIndex_][key] = this.temp_[key];
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
			throw "Having a hard time resolving '" + this.path_ + "' for rule '" + method + "'";

			return false;
		},


		/**
		 * The variable must have something inside it
		 */
		required_()
		{
			if (typeof this.value_ === 'undefined') {
				return false;
			}

			if (typeof this.value_ === 'number') {
				return true;
			} 

			if (typeof this.value_ === 'boolean') {
				return true;
			} 

			if (typeof this.value_ === 'string') {
				return this.value_.length > 0;
			}

			return this.uncertainInput('required');
		},

		/**
		 * The variable must be greater than a given value in size or length
		 */
		max_(args)
		{
			if (typeof this.value_ === 'number') {
				return this.value_ <= args[0];
			}
			
			if (typeof this.value_ === 'string') {
				return this.value_.length <= args[0];
			}

			if (typeof this.value_ === 'object') {
				return this.value_.length <= args[0];
			}

			return this.uncertainInput('max');
		},


		/**
		 * The variable must be less than a given value in size or length
		 */
		min_(args)
		{
			if (typeof this.value_ === 'number') {
				return this.value_ >= args[0];
			}
			
			if (typeof this.value_ === 'string') {
				return this.value_.length >= args[0];
			}

			if (typeof this.value_ === 'object') {
				return this.value_.length >= args[0];
			}

			return this.uncertainInput('max');
		},


		/**
		 * The field must equal one of the given arguments
		 */
		in_(args)
		{
			if (args.indexOf(this.value_) === -1) {
				return false;
			}

			return true;
		},


		/**
		 * The variable must be of a given size
		 */
		size_(args)
		{
			if (typeof this.value_ === 'number') {
				return this.value_ === args[0];
			}
			
			if (typeof this.value_ === 'string') {
				return this.value_.length === args[0];
			}

			if (typeof this.value_ === 'object') {
				return this.value_.length === args[0];
			}

			return this.uncertainInput('size');
		},


		/**
		 * The variable must equal a given argument
		 */
		equals_(args)
		{
			return this.value_ == args[0];
		},


		/**
		 * The variable must match a given regular expression
		 */
		regex_(expression)
		{
			if (typeof this.value_ !== 'string') {
				return false;
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

			if (this.value_.match(expression)) {
				return true;
			}
			else {
				return false;
			}
		},


		/**
		 * The variable must be a boolean
		 */
		boolean_()
		{
			return (typeof this.value_ === 'boolean');
		},


		/**
		 * The variable must be a string
		 */
		string_()
		{
			return (typeof this.value_ === 'string');
		},


		/**
		 * The variable must be a number
		 */
		number_()
		{
			return (typeof this.value_ === 'number');
		},


		/**
		 * The variable must be an array/object
		 */
		array_()
		{
			return (typeof this.value_ === 'object');
		},


		/**
		 * The variable must be a valid email address
		 */
		email_()
		{
			if (typeof this.value_ === 'string' && ! this.value_.length) {
				return true
			}
			else {
				return this.regex_(/^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z]{2,10})|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i);
			}
		},


		/**
		 * The variable must be a string with only alphanumeric characters
		 */
		alphaNum()
		{
			if (typeof this.value_ === 'string' && ! this.value_.length) {
				return true;
			}
			else {
				return this.regex_(/^[a-zA-Z0-9]+$/);
			}
		},
	},
}