# A Vue validator inspired by Laravel's Validator API
A simple input validator designed to be a mixin for Vue components. Simply register the variables and rules with the validator and you get automatic error detection. Supply the validator with the error message to display and they can be easily injected into the DOM as feedback for the user.


## Installation
Grab it in `src/Validator.js` and drop it wherever you keep your mixins.


## Usage


### Registering Variables

Firstly, tell the validator which variables should be watched. You have a few options here:
```javascript
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

[Much like Laravel](https://laravel.com/docs/5.2/validation#quick-writing-the-validation-logic), you declare the rules you want the inputs to follow as pipe delimited strings. Comma-separated arguments are added after a colon in the rule string.
```javascript
rules = {
	'required': 	'The input must not be empty',
	'boolean': 		'The input must be a boolean',
	'string': 		'The input must be a string',
	'number': 		'The input must be a number',
	'array': 		'The input must be an array (object)',
	'alpha_num': 	'The input must be an alphanumeric string',
	'email': 		'The input must be a valid email'
	'regex': 		'The input must match a given regular expression',
	'max': 			'The input must be less than or equal to a given value in value or length',
	'min': 			'The input must be greater than or equal to a given value in value or length',
	'size': 		'The input must be exactly a given value in value or length',
	'equals': 		'The input must be equal to a given value',
	'in': 			'The input must be equal to one of the given arguments',
}

examples = [
	'required|alpha_num',
	'email',
	'required|in:yes,no,maybe',
	'string|regex:^[0-9]{1,2}$',
]
```

 > Notes:

 > The `regex` rule currently does NOT support pipes within your expression argument. This is due to the fact that the rules string is parsed according to pipe delimiters.

 > Any arguments that return something truthy from `parseFloat(arg)` are saved as numbers and not strings.


`registerErrorChecking()` optionally takes a fourth and fifth argument. The fourth is a boolean that tells whether or not to automatically run error checking whenever the variable changes. The fifth argument (for arrays only) 

```javascript
registerErrorChecking('name', 'required', 'Enter a name', false) // only checked manually

registerErrorChecking('users.*.name', 'required', 'Enter a name', false, 50) // this.errors.users.length == 50
```

---

### Error checking

#### Automatic
By default, whenever Vue detects a change, the validator will automatically re-run error checking on that variable. You can switch to manual error checking with the optional fourth argument.
```javascript
this.me = 'Dan'
this.you = 'github'

this.registerErrorChecking('me', 'required', 'Enter something')
this.registerErrorChecking('you', 'required', 'Enter something', false)

this.me = ''
this.you = ''

console.log(this.errors.me) 	// 'Enter something'
console.log(this.errors.you) 	// ''
```

#### Manual
The `errorCheck()` function returns the number of detected errors. There are quite a few ways to use the `errorCheck()` function, but it all comes down to your desired scope.

##### Check all registered variables
```javascript
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
```javascript
this.name = ''
this.email = 'cats';

this.registerErrorChecking('name', 'required', 'Enter a name')
this.registerErrorChecking('email', 'email', 'Invalid email')

var errors = this.errorCheck('name')

console.log(errors)				// 1
console.log(this.errors.name) 	// 'Enter a name' 	
console.log(this.errors.email) 	// '' 	
```

##### Check a specific key on a variable
```javascript
this.location = { 
	city: { 
		name: 'Bradley Beach, NJ',
		zip: '984'
	}
}

this.registerErrorChecking('location.city.name', 'required', 'Enter your city')
this.registerErrorChecking('location.city.zip', 'required|size:5', ['Enter a zip', 'Invalid zip'])

var errors = this.errorCheck('location.city.zip') 

console.log(errors)								// 1
console.log(this.errors.location.city.name) 	// '' 	
console.log(this.errors.location.city.zip) 		// 'Invalid zip' 	
```

##### Check a specific index in an array
```javascript
this.users = [ 
	{ 
		name: 'Bob Example',
		email: 'bob@'
	},
	{ 
		name: 'Wendy Example',
		email: 'wendy@example'
	},
]


this.registerErrorChecking('users.*.email', 'required|email', 'Invalid email')

var errors = this.errorCheck('users.1.email') 

console.log(errors)							// 1
console.log(this.errors.users[0].email) 	// '' 	
console.log(this.errors.users[1].email) 	// 'Invalid email' 	
```

---

## Applications
### Displaying in the DOM
Since Vue is reactive, you can very easily attach error messages near inputs.
```html
<div>
	<input type="text" v-model="name">
	<span class="form-error">{{ errors.name }}</span>
</div>
```	

### Checking before Submitting
Simply place the following code into your `submit()` method and you are sure to have valid inputs!
```javascript
/**
 * POST form data to the server
 */
submit() 
{
	if (this.errorCheck() > 0) {
		return
	}
	else {
		// you're good to go!	
	}
}
```

## Putting it all together
```javascript
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


# Testing
The repo comes prepared for a `karma-jasmine` test suite. Run `npm run test-build` in the repo root followed by `karma start`.
