//----------------------- TODO -----------------------------

// add annotation view date created/modified
// add favorites button
// add favorites div
// add function to fill favorites div
// add function to make book favorite



//----------------------- ENUMERATIONS -----------------------------

const API_BASE_URL = "http://localhost:3000/api";
const GOOGLE_API_BASE_URL = "https://www.googleapis.com/books/v1/volumes?q=";




//----------------------- INIT. FUNCTIONS -----------------------------

// Fetches books from API+searchterm
async function fetchBooks(baseApi, searchTerm) {
    if (baseApi == GOOGLE_API_BASE_URL) {
        const response = await fetch(`${baseApi}${searchTerm}`)
        return (await response.json()).items.map(book => toBookDTO(book));
    }
    else if (baseApi == API_BASE_URL) {
        const response = await fetch(`${baseApi}${searchTerm}`)
        return (await response.json());
    }

}

// Fetches books and fills the DOM. Gets them from localstorage (/customBooks) first,
// If they are not stored, fetches them from Google's API.
async function getBooksFromGoogle() {
    document.getElementById("booksFlexDiv").innerHTML = ""
    const searchTerm = document.getElementById("bookSearchInput").value.toLowerCase().split(" ").join("+");
    const books = await fetchBooks(GOOGLE_API_BASE_URL, searchTerm);


    books.forEach(async (bookDTO) => {

        // Getset elements in variables
        const bookElement = document.getElementsByClassName("book-container")[0].cloneNode(true);
        const headerElement = bookElement.getElementsByClassName("book-container-header")[0];
        const descriptionElement = bookElement.getElementsByClassName("book-container-description")[0];
        const authorElement = bookElement.getElementsByClassName("book-container-subheader")[0];

        // Check if book exists in db
        const customBook = await getBookByID(bookDTO.id);
        // If yes gets it from local storage, else uses the response from google api.
        if (customBook != null) {
            // Set ID, Title, Description, Authors/Publisher
            bookElement.id = customBook.id;
            headerElement.innerHTML = customBook.title;
            authorElement.innerHTML = customBook.author;
            descriptionElement.innerHTML = customBook.description;

            // Checks if the book is a favorite and modifies the favorite button
            if (customBook.favorite) {
                const favoriteBtnElement = bookElement.getElementsByClassName("favorite-false")[0];
                favoriteBtnElement.classList.remove("favorite-false");
                favoriteBtnElement.classList.add("favorite-true");
                favoriteBtnElement.value = "Remove from Favorites";
            }
        }
        else {
            // Set ID, Title, Description, Authors/Publisher
            bookElement.id = bookDTO.id;
            headerElement.innerHTML = bookDTO.title;
            descriptionElement.innerHTML = getBookDescription(bookDTO);
            const authorContent = bookDTO.authors ? bookDTO.authors.join(", ") : bookDTO.publisher;
            authorElement.innerHTML = authorContent ? authorContent : "Unknown author/publisher.";
        }

        // Set thumbnail
        if (bookDTO.thumbnail) {
            const imageElement = bookElement.getElementsByClassName("book-container-image")[0];
            imageElement.src = bookDTO.thumbnail;
        }

        // Set download button
        if (bookDTO.acsTokenLink) {
            const downloadElement = bookElement.getElementsByClassName("book-container-download")[0];
            downloadElement.href = bookDTO.acsTokenLink;
            downloadElement.classList.remove("hidden");
        }

        // Appends books to DOM.
        bookElement.classList.remove("hidden");
        document.getElementById("booksFlexDiv").append(bookElement);

        // Appends existing annotations if the book exists.
        if (customBook != null) {
            customBook.annotations.forEach(annotation => {
                createAnnotationElement(annotation.parentBookId
                    , annotation.id
                    , annotation.title
                    , annotation.text
                    , annotation.dateCreated
                    , annotation.lastModified);
            })
        }
    })
}

// Pulls stored books, checks if they are a favorite and fills the flexdiv if they are.
async function getFavoriteBooks() {

    document.getElementById("booksFlexDiv").innerHTML = ""
    const books = await fetchBooks(API_BASE_URL, "/customBooks");

    books.forEach(book => {

        if (book.favorite) {
            // Getset elements in variables
            const bookElement = document.getElementsByClassName("book-container")[0].cloneNode(true);
            const headerElement = bookElement.getElementsByClassName("book-container-header")[0];
            const descriptionElement = bookElement.getElementsByClassName("book-container-description")[0];
            const authorElement = bookElement.getElementsByClassName("book-container-subheader")[0];
            const imageElement = bookElement.getElementsByClassName("book-container-image")[0];

            // Set ID, Title, Description, Authors/Publisher, Thumbnail
            bookElement.id = book.id;
            headerElement.innerHTML = book.title;
            descriptionElement.innerHTML = book.description;
            authorElement.innerHTML = book.author;
            imageElement.src = book.cover;

            //Modifies the favorite button
            let favoriteBtnElement = bookElement.getElementsByClassName("book-container-favoriteButton")[0];    
            favoriteBtnElement.classList.remove("favorite-false");
            favoriteBtnElement.classList.add("favorite-true");
            favoriteBtnElement.value = "Remove from Favorites";

            // Appends books to DOM.
            bookElement.classList.remove("hidden");
            document.getElementById("booksFlexDiv").append(bookElement);

            // Appends existing annotations if the book exists.
            book.annotations.forEach(annotation => {
                createAnnotationElement(annotation.parentBookId
                    , annotation.id
                    , annotation.title
                    , annotation.text
                    , annotation.dateCreated
                    , annotation.lastModified);
            })
        }
    })
}

async function addToFavorites(bookId) {

    // Gets target book element
    let targetBook = await getBookByID(bookId);

    // Checks if book exists in db. If it does't, saves it and fetches again.
    if (!targetBook) {
        await saveBookToDB(bookId);
        targetBook = await getBookByID(bookId);
    }

    const bookElement = document.getElementById(bookId);
    const favoriteBtnElement = bookElement.querySelector(".book-container-favoriteButton");

    // If book.favorite is false, adds class for css and updates the book in db.
    if (targetBook.favorite == false) {
        if (favoriteBtnElement.classList.contains("favorite-false")) {
            favoriteBtnElement.classList.remove("favorite-false")
        }
        favoriteBtnElement.classList.add("favorite-true");
        favoriteBtnElement.value = "Remove from Favorites";
        targetBook.favorite = true;
        updateBookByObject(targetBook);
    }
    // Does the same but in inverted
    else if (targetBook.favorite == true) {
        if (favoriteBtnElement.classList.contains("favorite-true")) {
            favoriteBtnElement.classList.remove("favorite-true")
        }
        favoriteBtnElement.classList.add("favorite-false");
        favoriteBtnElement.value = "Add to Favorites";
        targetBook.favorite = false;
        updateBookByObject(targetBook);
    }
}







//----------------------- MISC. FUNCTIONS -----------------------------

// Returns a string with current date and time. "YYYY-MM-DD_HH:MM:SS"
function getCurrentDateTime() {
    const currentDate = new Date().toISOString().substring(0, 19).replace('T', ' ');
    return currentDate;
}

// Shows/hides the edit form. If the Annotations form is visible - hides it.
function toggleEditForm(bookID) {
    let annotationForm = document.getElementById(bookID).querySelector('.book-container-annotationForm');
    if (annotationForm.style.display != "none") {
        annotationForm.style.display = "none";
    }
    const editForm = document.getElementById(bookID).querySelector('.book-container-editForm');
    editForm.style.display = editForm.style.display !== 'none' ? 'none' : 'block';
}

// Shows/hides the annotation form. If the Edit form is visible - hides it.
function toggleAnnotationForm(bookID) {
    let editForm = document.getElementById(bookID).querySelector('.book-container-editForm');
    if (editForm != "none") {
        editForm.style.display = "none";
    }
    const annotationForm = document.getElementById(bookID).querySelector('.book-container-annotationForm');
    annotationForm.style.display = annotationForm.style.display !== 'none' ? 'none' : 'block';
}

// Data Transfer Object used to map fetched Google Books.
function toBookDTO(book) {
    return {
        id: book.id,
        title: book.volumeInfo?.title,
        description: book.volumeInfo?.description,
        authors: book.volumeInfo?.authors,
        publisher: book.volumeInfo?.publisher,
        textSnippet: book.searchInfo?.textSnippet,
        thumbnail: book.volumeInfo?.imageLinks?.thumbnail,
        acsTokenLink: book.accessInfo?.pdf?.acsTokenLink,
    }
}

// Gets description from the Google API's response. It can be either description/snippet/missing.
function getBookDescription(book) {
    const defaultTitle = "Missing description / text snippet."

    if (book.description) {
        return `Description: ${JSON.stringify(book.description).substring(0, 498)}...`;
    }
    else if (book.textSnippet) {
        return `Text snippet: ${JSON.stringify(book.textSnippet)}`
    }

    return defaultTitle;
}






//----------------------- ANNOTATION HANDLERS -----------------------------

// Creates an annotation through the annotation form under a book.
async function submitAnnotation(bookID) {

    // Gets target annotation title input field's value
    let annotationTitleInputText = document.getElementById(bookID)
        .querySelector(".book-container-annotationForm")
        .querySelector(".annotation-form-title")
        .value;

    // Gets target annotation description input field's value
    let annotationDescriptionInputText = document.getElementById(bookID)
        .querySelector(".book-container-annotationForm")
        .querySelector(".annotation-form-input")
        .value;

    // Checks if annotation edit fields (title/description) are empty
    if (!annotationTitleInputText.trim() && !annotationDescriptionInputText.trim()) {
        alert("Please enter both an annotation title and body before trying to submit it.");
    }
    else if (annotationTitleInputText.length > 40) {
        alert("The title should be less than 40 characters long.")
    }
    else if (annotationDescriptionInputText.length > 256) {
        alert("The description should be less than 256 characters long.")
    }
    else {
        //Tries to fetch the book object that the edited annotation will be linked to
        let targetBook = await getBookByID(bookID);

        // Checks the response - if book isn't stored, stores it and fetches the object again.
        if (!targetBook) {
            await saveBookToDB(bookID);
            targetBook = await getBookByID(bookID);
        }

        // Gets what the next annotation index should be (Gets last annotation's ID + 1, if no annotations, sets 1)
        annotationIndex = targetBook.annotations.length ?
            targetBook.annotations[targetBook.annotations.length - 1].id + 1 : 1


        // Create annotation object
        const annotationObject = {};
        annotationObject.id = annotationIndex;
        annotationObject.parentBookId = bookID;
        annotationObject.title = annotationTitleInputText;
        annotationObject.text = annotationDescriptionInputText;
        annotationObject.dateCreated = getCurrentDateTime();
        annotationObject.lastModified = "Never modified.";
        targetBook.annotations.push(annotationObject);

        createAnnotationElement(annotationObject.parentBookId
            , annotationObject.id
            , annotationObject.title
            , annotationObject.text
            , annotationObject.dateCreated
            , annotationObject.lastModified);
        updateBookByObject(targetBook);

        // Clears input fields
        document.getElementById(bookID)
            .querySelector(".book-container-annotationForm")
            .querySelector(".annotation-form-title")
            .value = "";

        document.getElementById(bookID)
            .querySelector(".book-container-annotationForm")
            .querySelector(".annotation-form-input")
            .value = "";
    }
}

// Creates the annotation element, appends it to the view (in div: annotations-container)
function createAnnotationElement(bookID, annotationIndex, annotationTitle, annotationText, dateCreated, dateModified) {

    // Gets the container to which the annotations will be appended to
    const annotationsDiv = document.getElementById(bookID)
        .querySelector(".book-container-annotationForm")
        .querySelector(".annotations-container");

    if (annotationTitle.trim() && annotationText.trim()) {

        // DIV element containing all elements of a single annotation
        // Every annotation div has id "annotation-annotationId-parentBookID"
        const annotationDiv = document.createElement("div");
        annotationDiv.classList.add('annotation-container');
        annotationDiv.id = `annotation-${annotationIndex}-${bookID}`;

        // Annotation title element
        const annotationTitleElement = document.createElement("h4");
        annotationTitleElement.innerHTML = annotationTitle;
        annotationTitleElement.classList.add("annotation-title");
        // Annotation title edit field element (hidden by default)
        const editTitleField = document.createElement('input');
        editTitleField.type = "text";
        editTitleField.classList.add("edit-annotation-title");
        editTitleField.id = `${bookID}-edit-title`
        editTitleField.placeholder = "Enter title edit...";
        editTitleField.hidden = true;

        // Annotation text body field element
        const annotationTextElement = document.createElement("p");
        annotationTextElement.innerHTML = annotationText;
        annotationTextElement.classList.add(`annotation-text`);
        // Annotation text body edit field element (hidden by default)
        const editTextField = document.createElement('textarea');
        editTextField.type = "text";
        editTextField.classList.add("edit-annotation-text");
        editTextField.id = `${bookID}-edit-text`
        editTextField.placeholder = "Enter body edit...";
        editTextField.hidden = true;

        // Edit button
        const editButton = document.createElement("input");
        editButton.type = "button";
        editButton.classList.add("edit-annotation-button");
        editButton.value = "Edit";
        editButton.onclick = function () { editAnnotation(this.parentElement) };
        // Delete button
        const deleteButton = document.createElement("input");
        deleteButton.type = "button";
        deleteButton.classList.add("delete-button");
        deleteButton.value = "Delete";
        deleteButton.onclick = function () { deleteAnnotation(this.parentElement) };

        // Date created/modified paragraph
        const createdModifiedDiv = document.createElement("div");
        createdModifiedDiv.classList.add("created-modified-div")
        const dateCreatedParagraph = document.createElement("p");
        const dateModifiedParagraph = document.createElement("p");
        dateCreatedParagraph.classList.add(`created`);
        dateModifiedParagraph.classList.add(`modified`);

        dateCreatedParagraph.innerHTML = `<small>Date created: ${dateCreated}</small>`;
        dateModifiedParagraph.innerHTML = `<small>Date modified: ${dateModified}</small>`;

        createdModifiedDiv.append(dateCreatedParagraph);
        createdModifiedDiv.append(dateModifiedParagraph);

        // Appends above elements to create the annotation div.
        annotationDiv.append(annotationTitleElement);
        annotationDiv.append(editTitleField);
        annotationDiv.append(annotationTextElement);
        annotationDiv.append(editTextField);
        annotationDiv.append(editButton);
        annotationDiv.append(deleteButton);
        annotationDiv.append(createdModifiedDiv);

        // Appends above annotation div to div with all annotations.
        annotationsDiv.append(annotationDiv);
    }
}

function editAnnotation(annotationElement) {

    // Gets both annotation element and edit field
    // and does logic based on which one is visible on screen
    const annotationTitleElement = annotationElement.querySelector(".annotation-title");
    const annotationTitleEditField = annotationElement.querySelector(".edit-annotation-title");
    const annotationDescriptionElement = annotationElement.querySelector(".annotation-text");
    const annotationDescriptionEditField = annotationElement.querySelector(".edit-annotation-text");
    const annotationDateModifiedElement = annotationElement.querySelector(".created-modified-div").querySelector(".modified");


    // If the annotation edit fields are hidden, unhides them and hides the uneditable fields.
    if (annotationTitleEditField.hidden && annotationDescriptionEditField.hidden) {

        annotationTitleElement.hidden = true;
        annotationDescriptionElement.hidden = true;

        annotationTitleEditField.hidden = false;
        annotationDescriptionEditField.hidden = false;

    }
    // Else if the edit field elements are visible
    else if (!annotationTitleEditField.hidden && !annotationDescriptionEditField.hidden) {

        // Logic if both edit fields have content inside
        if (annotationDescriptionEditField.value.trim().length > 0 && annotationTitleEditField.value.trim().length > 0) {
            annotationTitleElement.innerHTML = JSON.stringify(annotationTitleEditField.value);
            annotationDescriptionElement.innerHTML = JSON.stringify(annotationDescriptionEditField.value);
        }
        // Logic if the Edit Description empty, but Edit Title has data
        else if (annotationDescriptionEditField.value.trim().length == 0 && annotationTitleEditField.value.trim().length > 0) {
            annotationTitleElement.innerHTML = annotationTitleEditField.value;
        }
        // Logic if the Edit Title empty, but Edit Description has data
        else if (annotationDescriptionEditField.value.trim().length > 0 && annotationTitleEditField.value.trim().length == 0) {
            annotationDescriptionElement.innerHTML = JSON.stringify(annotationDescriptionEditField.value);
        }
        annotationDateModifiedElement.innerHTML = `<small>Date modified: ${getCurrentDateTime()}</small>`;
        updateAnnotationDB(annotationElement);

        // Hides edit fields
        annotationTitleElement.hidden = false;
        annotationDescriptionElement.hidden = false;
        // Shows uneditable fields
        annotationTitleEditField.hidden = true;
        annotationDescriptionEditField.hidden = true;

        // Clears edit fields
        annotationTitleEditField.value = "";
        annotationDescriptionEditField.value = "";
    }

}

// Gets current values of a given annotation and updates it in the DB. Also changes last modified date.
async function updateAnnotationDB(annotationElement) {
    const annotationTitle = annotationElement.querySelector(".annotation-title");
    const annotationDescription = annotationElement.querySelector(".annotation-text");
    const annotationDateModified = annotationElement.querySelector(".created-modified-div").querySelector(".modified");
    const parentBookId = annotationElement.id.split("-")[2];
    const annotationIndex = annotationElement.id.split("-")[1];

    let book = await getBookByID(parentBookId);
    book.annotations[annotationIndex - 1].title = annotationTitle.innerHTML;
    book.annotations[annotationIndex - 1].text = annotationDescription.innerHTML;
    book.annotations[annotationIndex - 1].lastModified = getCurrentDateTime();

    updateBookByObject(book);
}

// Incomplete, to delete button as well and to implement a function that deletes it from the DB file.
async function deleteAnnotation(annotationElement) {

    const annotationId = annotationElement.id.split("-")[1];
    const annotationParentBookId = annotationElement.id.split("-")[2];

    let parentBook = await getBookByID(annotationParentBookId);

    for (let index = 0; index < parentBook.annotations.length; index++) {
        if (parentBook.annotations[index].id == annotationId) {
            parentBook.annotations.splice(index, 1);
            break;
        }
    }

    await updateBookByObject(parentBook);
    document.getElementById(annotationElement.id).remove();
}






// ----------------------- BOOK HANDLERS -----------------------------

// Edits the displayed book and saves the result in the db
async function editBook(bookID) {

    // Gets target book element and edit form.
    const book = document.getElementById(bookID);
    const bookEditForm = book.querySelector(".book-container-editForm");

    // Gets info to update. If present - updates. If missing - no changes.
    if (bookEditForm.querySelector(".edit-title").value.length != 0) {
        book.querySelector(".book-container-header").innerHTML = bookEditForm.querySelector(".edit-title").value;
        bookEditForm.querySelector(".edit-title").value = "";
    }
    if (bookEditForm.querySelector(".edit-author").value.length != 0) {
        book.querySelector(".book-container-subheader").innerHTML = bookEditForm.querySelector(".edit-author").value;
        bookEditForm.querySelector(".edit-author").value = "";
    }

    if (bookEditForm.querySelector(".edit-description").value.length != 0) {
        book.querySelector(".book-container-description").innerHTML = bookEditForm.querySelector(".edit-description").value;
        bookEditForm.querySelector(".edit-description").value = "";
    }

    // Checks if book exists in storage. If it does - PUT method. If it doesn't - POST.
    const checkBookExists = await getBookByID(bookID);
    if (checkBookExists != null) { await updateBookByID(bookID); }
    else { await saveBookToDB(bookID); }
}

// Saves a displayed book in the database file by ID.
async function saveBookToDB(bookID) {

    const book = document.getElementById(bookID);

    const bookExists = await getBookByID(bookID);
    if (bookExists != null) {
        return "Book already exists.";
    }
    else {
        const bookObj = {
            "id": bookID,
            "title": book.querySelector(".book-container-header").innerHTML,
            "author": book.querySelector(".book-container-subheader").innerHTML,
            "description": book.querySelector(".book-container-description").innerHTML,
            "cover": book.querySelector(".book-container-image").src,
            "favorite": false,
            "annotations": []
        };

        try {
            const response = await fetch(`${API_BASE_URL}/customBooks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookObj)
            });
            const responseBody = await response.json();
            return responseBody;
        }
        catch (error) {
            console.log("Error while adding book : Incorrect response body.")
        }
    }
}

// Gets book from DB by ID and returns it in JSON format. 
async function getBookByID(bookID) {
    const response = await fetch(`${API_BASE_URL}/customBooks/${bookID}`, { method: 'GET' })
        .then(async (data) => {
            if (data.ok) {
                data = await data.json()
                return data;
            }
            else {
                return Promise.reject('Book not found locally.');
            }
        })
        .catch((e) => { console.log(e) });

    return response;
}

// Gets the book info displayed on screen through the DOM and updates the saved book in the DB with it.
async function updateBookByID(bookID) {

    const book = document.getElementById(bookID);
    const bookFromDB = await getBookByID(bookID);

    bookFromDB.title = book.querySelector(".book-container-header").innerHTML;
    bookFromDB.author = book.querySelector(".book-container-subheader").innerHTML;
    bookFromDB.description = book.querySelector(".book-container-description").innerHTML;

    const updateBook = await fetch(`${API_BASE_URL}/customBooks/${bookID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookFromDB)
    });
}

// Updates a book in DB using another book object.
async function updateBookByObject(bookObject) {
    const updateBook = await fetch(`${API_BASE_URL}/customBooks/${bookObject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookObject)
    });
}   