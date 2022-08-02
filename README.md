A SPA application that uses Google's Books API to fetch books based on your search.

Once searched, it shows the first 10 books that the API returns.

Then the books that were found each have the following functionality :
a) Annotations with title/description/datecreated/datemodified that can be edited.
b) Edited - the title,authors and description of a book can be edited
c) Makred as favorite

The app stores the book in a local database (simple file holding data in json using json-server) and is hosted using "lite-server"

To run this app you need to have npm/yarn installed.
Open the project, open two terminals, in the first one run "npm/yarn api" and in the second "npm/yarn start".
These are two scripts that run the json-server (api) and then the lite-server (start)
