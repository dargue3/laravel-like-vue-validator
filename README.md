# A Vue validator inspired by Laravel's Validator API
A sweet input validator designed to be a mixin for Vue components. Simply register the variables and rules with the validator and you get automatic error detection. Supply the validator with the error message to display and they can be easily injected into the DOM as real-time feedback for the user.


## Installation
Grab it in `src/Validator.js` and drop it wherever you keep your mixins. Import at the top of the file with `/path/to/Validator.js`.


## Testing
This repo comes prepared for a `karma-jasmine` test suite. If you are creating your own rules or editing the validator inner-workings, there are plenty of test examples to get you started. Run `npm run test-build` in the repo root to download dependencies.  To start testing, run  `karma start`. From there, every time you save the file, Karma will re-run the tests.


## Usage

### Register Variables for Error Checking

##### Argument 1
Firstly, tell the validator which variables should be watched. You have a few options here.
```js
this.name = 'Dan'
this.location.zip = '07720'
this.users = [
	{ name: 'Bob', email: 'bob@example.com' },
	{ name: 'Wendy', email: 'wendy@example.com' }
]


this.registerErrorChecking('name', 'required', 'Enter a name');
this.registerErrorChecking('location.zip', 'required|size:5', ['Enter a zip', 'Invalid zip'])
this.registerErrorChecking('users.*.email', 'email', 'Invalid email')
```

#### Argument 2
[Much like Laravel](https://laravel.com/docs/5.2/validation#quick-writing-the-validation-logic), you declare the rules you want the inputs to follow as pipe delimited strings. Comma-separated arguments are added after a colon in the rule string.
```js
rules = {
	'required': 	'The input must not be empty',
	'boolean': 		'The input must be a boolean',
	'string': 		'The input must be a string',
	'number': 		'The input must be a number',
	'array': 		'The input must be an array (object)',
	'alpha_num': 	'The input must be an alphanumeric string',
	'alpha_dash': 	'The input must be an alphanumeric string with dashes or underscores',
	'email': 		'The input must be a valid email'
	'regex': 		'The input must match a given regular expression',
	'max': 			'The input must be less than or equal to a given argument in value or length',
	'min': 			'The input must be greater than or equal to a given argument in value or length',
	'size': 		'The input must be exactly a given argument in value or length',
	'equals': 		'The input must be equal to a given argument',
	'in': 			'The input must be equal to one of the given arguments',
}

examples = [
	'required|alpha_num',
	'email',
	'required|in:yes,no,maybe',
	'regex:^[0-9]{1,2}$',
]
```

>  Notes:
> 
>  The `regex` rule currently does **not** support pipes within your expression argument. This is due to the fact that the rules string is parsed according to pipe delimiters. If you run into this issue, make a workaround and send a PR or perhaps just add your own specific rule to the `validRules` array and define it at the bottom of the file. I’ll even make it easy and allow you to use my `regex_()` function.
> 
>  Any arguments that return something truthy from `parseFloat(arg)` are saved as numbers and not strings.


#### Argument 3
The third argument is the error message to display when the variable breaks its rule. If there is just a single rule, the third argument accepts a string. If there are multiple rules, pass in an array of messages whose index correspond to the order of the rule string. This argument is technically optional, as it uses a fallback error message of `'Invalid input’`, however 9 out of 10 users agree they want something more helpful than that. 
```js
registerErrorChecking('name', 'required', 'Enter a name')
registerErrorChecking('email', 'required|email', ['Enter a name', 'Invalid Email'])
registerErrorChecking('color', 'in:red,yellow')
```


#### Argument 4  (optional)
A boolean that tells whether or not to automatically run error checking whenever the variable changes. 
```js
registerErrorChecking('name', 'required', 'Enter a name', false) // only checked manually
```


#### Argument 5  (optional)
When you've got an array that doesn't get initialized to its full possible size, eliminate pesky Vue error messages about undefined variables by allocating indices in `this.errors` .
```js
registerErrorChecking('users.*.name', 'required', 'Enter a name', false, 50)

console.log(this.errors.users.length) // 50
```

---

### Error checking

#### Automatic
By default, `Validator.js` attaches a `$watch()` closure and whenever Vue detects a change, the validator will automatically re-run error checking on that variable. You can switch to manual error checking with the optional fourth argument.
```js
this.me = 'Dan'
this.you = 'github'

this.registerErrorChecking('me', 'required', 'Enter something')
this.registerErrorChecking('you', 'required', 'Enter something', false)

this.me = ''
this.you = ''

console.log(this.errors.me) 		// 'Enter something'
console.log(this.errors.you) 	// ''
```

#### Manual
 `errorCheck()` returns the number of detected errors. There are quite a few ways to use the `errorCheck()` function, but it all comes down to your desired scope.

##### Check all registered variables
Forgo any arguments and `Validator.js` will check all the registered variables.
```js
this.name = ''
this.email = 'cats';

this.registerErrorChecking('name', 'required', 'Enter a name')
this.registerErrorChecking('email', 'email', 'Invalid email')

var errors = this.errorCheck() 

console.log(errors)				// 2
console.log(this.errors.name) 	// 'Enter a name' 	
console.log(this.errors.email) 	// 'Invalid email' 	
```

##### Check only a specific variable
Use the same string that you used to register the variable to return the number of errors detected on that variable only. 
```js
this.name = '';
this.email = 'cats';

this.registerErrorChecking('name', 'required', 'Enter a name')
this.registerErrorChecking('email', 'email', 'Invalid email')

var errors = this.errorCheck('name')

console.log(errors)				// 1
console.log(this.errors.name) 	// 'Enter a name' 	
console.log(this.errors.email) 	// '' 	
```

If you registered multiple nested variables, passing through the root variable will check all registered keys on that variable.
```js
this.user = {
	name: '',
	age: 12,
}

this.registerErrorChecking('user.name', 'required', 'Enter a name')
this.registerErrorChecking('user.age', 'required|min:18', ['Enter your age', 'Adults Only'])

var errors = this.errorCheck('user')

console.log(errors)			// 2
console.log(this.errors.user.name)	// 'Enter a name' 	
console.log(this.errors.user.age)	// 'Adults Only' 	
```

##### Check a specific key on a variable
Given the examples above, it stands to reason that you can error check a specific key in an object as well.
```js
this.location = { 
	city: { 
		name: 'Bradley Beach, NJ',
		zip: '984'
	}
}

this.registerErrorChecking('location.city.name', 'required', 'Enter your city')
this.registerErrorChecking('location.city.zip', 'required|size:5', ['Enter a zip', 'Invalid zip'])

var errors = this.errorCheck('location.city.zip') 

console.log(errors)				// 1
console.log(this.errors.location.city.name)	// '' 	
console.log(this.errors.location.city.zip)	// 'Invalid zip' 	
```

##### Check a specific index in an array or the whole thing
Here's how to error check an array of objects
```js
this.users = [ 
	{ name: 'Bob Example', email: 'bob@' },
	{ name: 'Wendy Example', email: 'wendy@example' },
]

this.goodIdeas = [
	{ step: 'Validator' },
	{ step: 'GitHub' },
	{ step: '???' },
	{ step: 'Profit!' }
]

this.registerErrorChecking('users.*.email', 'required|email', 'Invalid email')
this.registerErrorChecking('goodIdeas.*.step', 'alpha_num', 'Only A thru Z')

var errors = this.errorCheck('users.1.email')

console.log(errors)				// 1
console.log(this.errors.users[0].email) 	// '' 	
console.log(this.errors.users[1].email) 	// 'Invalid email' 

errors = this.errorCheck('goodIdeas')

console.log(errors)				// 2
console.log(this.errors.goodIdeas[0].step) 	// '' 
console.log(this.errors.goodIdeas[1].step) 	// ''
console.log(this.errors.goodIdeas[2].step) 	// 'Only A thru Z'
console.log(this.errors.goodIdeas[3].step) 	// 'Only A thru Z'	
```

---

## Applications
Well now I know how to use it, what is this good for?

### Displaying in the DOM
Vue is reactive, so you can very easily attach error messages near inputs. Since the error message has a length of zero until the moment `this.name` breaks its assigned rules, the `<span>` won't be shown on the screen until there's an error. **Bonus:** You can add further feedback from the input (like a red border) by conditionally binding a CSS class.
```html
<div class="form">
	<input type="text" :class="{ 'form-error' : errors.name }" v-model="name">
	<span class="form-error">{{ errors.name }}</span>
</div>
```	


### Validation before an AJAX request
Place the following code at the top of your `submit()` method and you are sure to have valid inputs *before* they arrive to the backend. Not that this retracts from the necessity of backend validation in the slightest
```js
/**
 * POST the form to the server
 */
submit() 
{
	if (this.errorCheck() > 0) {
		return
	}

	// you're good to go!
}
```

---

## Putting it all together
Here's how it'll look when all is said and done.
```js
import Vue from 'vue'
import Validator from './mixins/Validator.js'

const vm = new Vue({
	template: '<div></div>',
	mixins: [ Validator ],
	
	data: function()
	{
		return [
			users: [
				{ name: 'Bob', email: 'bob@example.com' },
				{ name: 'Wendy', email: 'bob@example' }, 	// note the error
			],
			
			location: {
				city: {
					name: 'Bradley Beach',
					zip: '070' 				// ouch, another one
				}
			}
		];
	},
	
	/**
	 * Register error checking in beforeCompiled() to ensure this.errors is
	 * initialized before loading the DOM
   	 */
	beforeCompiled: function()
	{
		this.registerErrorChecking('users.*.name', 'required|max:50', ['Enter a name', 'Your name is too long!'])
		this.registerErrorChecking('users.*.email', 'required|email', 'Bad email')
		
		this.registerErrorChecking('location.city.zip', 'required|size:5|number', 'Invalid zip')
		this.registerErrorChecking('location.city.name', 'required|string', 'Enter your city')
	},
	
	ready: function()
	{
		var errors = this.errorCheck();
		
		console.log(errors) // 2
		
		console.log(this.errors[1].email) 			// 'Bad email'
		console.log(this.errors.location.city.zip) 	// 'Invalid zip'
		
	}
})
```
