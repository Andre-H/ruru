# huhu
###What's this

I think everyone using Protractor to test their AngularJS web app should be able to easily:
- Run the same tests once in each different browser (multi capabilities)
- For each browser type they have, run their test specs in parallel (file sharding)
- For this setup, have a XML JUnit format report already consolidated for easy integration with CI such as Jenkins
- For this setup, have a HTML format report easily readable to summarize execution and with screen captures
- Be able to run all tests in this setup with a simple command (we used grunt)

So this is a gist showing how to achieve just that.

###Requirements:

1. Install Node.js

2. Install Grunt-cli

###Give it a go

1. Clone this repository

2. **npm install**

3. **grunt install**

4. **grunt**

###From here on

Create test specs in tests/e2e/specs

Create page objects in tests/e2e/pageobjects

And test away.
