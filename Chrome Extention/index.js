
/**
 * Every time the chrome extention opens, it will run these functions
 */

document.addEventListener('DOMContentLoaded', function () {
    console.log("Startup . . . ");
    displayStoredCountdowns();
    setDefaultDate();
    printStoredEventData();
    loadLightModeState();
    document.getElementById("lightMode").addEventListener("click", changeLightMode);

    // Event Listeners
    document.getElementById("addNewButton").addEventListener("click", displayOptions);
    document.getElementById("cancelButton").addEventListener("click", hideAllMenus);
    document.getElementById("cancelButtonBirthday").addEventListener("click", hideAllMenus);
    document.getElementById("submitEventButton").addEventListener("click", submitEvent);
    document.getElementById("submitBirthdayButton").addEventListener("click", submitBirthday);
    // Buttons along the bottom
    document.getElementById("swapElements").addEventListener("click", clickTwoElements);
    document.getElementById("deleteZeros").addEventListener("click", deleteExpiredCountdowns);
    document.getElementById("SortByTime").addEventListener("click", sortByTime);
    document.getElementById("SortByName").addEventListener("click", sortByName);
    //document.getElementById("Friends").addEventListener("click", displayFriendsPage);
    console.log("Startup Complete ");
});


function displayFriendsPage() {
    // Load and display the HTML file for the friends page
    window.location.href = "friends.html"; // Assuming friends.html is the filename for the friends page
}

// ------------- Buttons along the bottom of the page --------------

/**
 * Sorts all the items in the list alphebetically, a > z
 */
function sortByName() {
    retrieveEventData(function (events) {
        // Sort the events based on their titles
        events.sort((a, b) => {
            const titleA = a.title.toLowerCase();
            const titleB = b.title.toLowerCase();
            if (titleA < titleB) return -1;
            if (titleA > titleB) return 1;
            return 0;
        });

        // Save the sorted events back to storage
        chrome.storage.sync.set({ 'events': events }, function () {
            console.log('Events sorted by name:', events);
            // After sorting, re-display the stored countdowns
            displayStoredCountdowns();
        });
    });
}

/**
 *  Sorts the items in the list from least time left to most
 */
function sortByTime() {
    retrieveEventData(function (events) {
        // Sort the events based on their countdown time
        events.sort((a, b) => {
            const eventADateTime = new Date(`${a.date}T${a.time}`).getTime();
            const eventBDateTime = new Date(`${b.date}T${b.time}`).getTime();
            return eventADateTime - eventBDateTime;
        });

        // Save the sorted events back to storage
        chrome.storage.sync.set({ 'events': events }, function () {
            console.log('Events sorted by time:', events);
            // After sorting, re-display the stored countdowns
            displayStoredCountdowns();
        });
    });
}


// This is for clickTwoElements
let firstClickedIndex = null;

/**
 * First part of Swapping two elements, more visual marks for what items will be swapped
 * Takes the indexes of those two items, and passes it to swapItems
 */
function clickTwoElements() {
    const countdownItems = document.querySelectorAll('.countdown-item');

    // Add event listeners to countdown items
    countdownItems.forEach((countdownItem, index) => {
        countdownItem.addEventListener('click', () => {
            if (firstClickedIndex === null) {
                // First click, store the index
                firstClickedIndex = index;
                console.log('First element clicked:', index);
                countdownItem.classList.add('selected'); // Add class to mark the first clicked item
            } else {
                // Second click, swap the items
                console.log('Second element clicked:', index);
                swapItems(firstClickedIndex, index);
                firstClickedIndex = null; // Reset the first clicked index
                countdownItems[firstClickedIndex].classList.remove('selected'); // Remove border from the previously clicked item
            }
        });

        // Add event listener for mouse enter to increase brightness
        countdownItem.addEventListener('mouseenter', () => {
            countdownItem.style.filter = 'brightness(120%)'; // Increase brightness on mouse enter
        });

        // Add event listener for mouse leave to decrease brightness
        countdownItem.addEventListener('mouseleave', () => {
            countdownItem.style.filter = 'brightness(100%)'; // Decrease brightness on mouse leave
        });
    });

    // Listen for keydown events to cancel the operation
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' || event.key === 'Delete') {
            // Cancel the operation
            console.log('Operation cancelled');
            firstClickedIndex = null; // Reset the first clicked index
            countdownItems.forEach((countdownItem) => {
                countdownItem.classList.remove('selected'); // Remove border from all countdown items
            });
        }
    });
}


/**
 * Given two indexes, it will swap them and then update the desplay to show the swap
 * @param {*} index1 
 * @param {*} index2 
 */
function swapItems(index1, index2) {
    retrieveEventData(function (events) {
        placeholderEvent = events[index1];
        events[index1] = events[index2];
        events[index2] = placeholderEvent;
        console.log("Swapped\n", events[index1], events[index2]);

        chrome.storage.sync.set({ 'events': events }, function () {
            console.log('Event data updated:', events);
            // After updating the event data, re-display the stored countdowns
            displayStoredCountdowns();
        });

    });
}

// Function to delete expired countdowns, countdowns that do not repeat and reached 0
function deleteExpiredCountdowns() {
    retrieveEventData(function (events) {
        const currentDate = new Date().getTime();
        const updatedEvents = events.filter(event => {
            const eventDateTime = new Date(`${event.date}T${event.time}`).getTime();
            const timeDifference = eventDateTime - currentDate;
            if (event.repeat && timeDifference <= 0) {
                // If the event is repeatable and the countdown has reached zero, keep it for the next occurrence
                return true;
            } else if (timeDifference <= 0 && !event.repeat) {
                // If the event is not repeatable and the countdown has reached zero, remove it
                return false;
            } else {
                // For events whose countdowns haven't reached zero yet, keep them
                return true;
            }
        });

        chrome.storage.sync.set({ 'events': updatedEvents }, function () {
            console.log('Finished countdowns deleted.');
            // After deleting expired countdowns, re-display the stored countdowns
            displayStoredCountdowns();
        });
    });
}


// ------------- End Buttons along the bottom of the page --------------



/**
 * Shows the add Event and add Birthday buttons
 */
async function displayOptions() {
    setDefaultDate();
    const addNewOptions = document.getElementById('AddNewOptions');
    const birthdayMenu = document.getElementById('birthdayMenu');
    const eventMenu = document.getElementById('eventMenu');
    document.getElementById("eventButton").addEventListener("click", displayEventMenu);
    document.getElementById("birthdayButton").addEventListener("click", displayBirthdayMenu);

    // // Check if birthday menu is displayed
    if (addNewOptions.style.display === 'block' || birthdayMenu.style.display === 'block' || eventMenu.style.display === 'block') {
        hideAllMenus(); // If any menu is displayed, close them
    } else {
        addNewOptions.style.display = 'block';
    }
}

/**
 * Displays the items in the countdown on the page, with the edit and delete buttons attached
 * Also handles the functions that occur when clicking those buttons
 */
function displayStoredCountdowns() {

    const countdownList = document.getElementById('countdownList');

    // Retrieve stored event data
    retrieveEventData(function (events) {
        // Clear existing countdowns
        countdownList.innerHTML = '';

        if (events && events.length > 0) {
            // Iterate through each stored event
            events.forEach(function (event, index) {
                // Create countdown item element
                const countdownItem = document.createElement('div');
                countdownItem.classList.add('countdown-item');

                // Create countdown item content including delete button
                const countdownContent = document.createElement('div');
                countdownContent.classList.add('countdown-content'); // Add class for styling

                // Create title element
                const titleElement = document.createElement('p');
                titleElement.textContent = event.title;
                titleElement.classList.add('title'); // Add class for styling

                // Add age for birthdays
                if (event.isBirthday) {
                    const ageElement = document.createElement('span');
                    ageElement.textContent = `[${event.age} yrs]`;
                    ageElement.classList.add('age'); // Add class for styling
                    titleElement.appendChild(ageElement);
                }

                const moreStuff = document.createElement('p');
                moreStuff.textContent = "Mth : Day : Hr : Min : Sec";
                moreStuff.classList.add('monthDay'); // Add class for styling

                // Create countdown details element
                const detailsElement = document.createElement('p');
                detailsElement.classList.add('details'); // Add class for styling

                // Append title and details elements to the countdown content
                countdownContent.appendChild(titleElement);
                countdownContent.appendChild(detailsElement);
                countdownContent.appendChild(moreStuff);



                // Create delete button for each countdown
                const deleteIcon = document.createElement('img');
                deleteIcon.src = 'images/trashIcon.png';
                deleteIcon.alt = 'Delete';
                deleteIcon.classList.add('delete-icon');

                // Add event listener to delete icon
                deleteIcon.addEventListener('click', function () {
                    removeEvent(index);
                });

                // Create edit button for each countdown
                const editIcon = document.createElement('img');
                editIcon.src = 'images/editIcon.png';
                editIcon.alt = 'Edit';
                editIcon.classList.add('edit-icon');



                /**
                 * When the edit button is clicked, it checks if it's a birthday or not, and  
                 * handles all editing
                 */
                editIcon.addEventListener('click', function () {
                    if (event.isBirthday) {
                        document.getElementById("cancelButtonEditBirthday").addEventListener("click", hideAllMenus);
                        const editBirthdayMenu = document.getElementById('editBirthdayMenu');
                        const titleInput = document.getElementById('eventTitleBirthdayEdit');
                        const dateInput = document.getElementById('eventDateBirthdayEdit');
     //                   const publicCheckbox = document.getElementById('publicCountdownBirthdayEdit');

                        // Set the title input value
                        titleInput.value = event.title;

                        // Calculate the birth year based on the current year and age
                        const currentDate = new Date();
                        const currentYear = currentDate.getFullYear();
                        const birthMonth = Number(event.date.split('-')[1]); // Extract birth month
                        const birthDay = Number(event.date.split('-')[2]);

                        let birthYear = currentYear - event.age;

                        if (!(currentDate.getMonth() > birthMonth || (currentDate.getMonth() === birthMonth && currentDate.getDate() >= birthDay))) {
                            birthYear -= 1;
                        }

                        // Set the date input value with the original birth year
                        const birthDate = new Date(`${birthYear}-${birthMonth}-${birthDay}`);
                        birthDate.setFullYear(birthYear);
                        const formattedBirthDate = `${birthDate.getFullYear()}-${String(birthDate.getMonth() + 1).padStart(2, '0')}-${String(birthDate.getDate()).padStart(2, '0')}`;
                        dateInput.value = formattedBirthDate;

                        // Set the public checkbox value
 //                       publicCheckbox.checked = event.public;

                        // Show the birthday edit menu
                        editBirthdayMenu.style.display = 'block';
                        document.getElementById("submitEditedBirthdayButton").addEventListener("click", function () {
                            submitEditBirthday(index);
                        });
                    } else {
                        document.getElementById("cancelButtonEdit").addEventListener("click", hideAllMenus);
                        const editEventMenu = document.getElementById('editEventMenu');
                        const eventTitleEdit = document.getElementById('eventTitleEdit');
                        const eventDateEdit = document.getElementById('eventDateEdit');
                        const eventTimeEdit = document.getElementById('eventTimeEdit');
                        const repeatCheckboxEdit = document.getElementById('repeatCheckboxEdit');
//                        const publicCountdownEdit = document.getElementById('publicCountdownEdit');

                        //Make sure to desplay the values that are in the system to show you are editing something.
                        eventTitleEdit.value = event.title;
                        eventDateEdit.value = event.date;
                        eventTimeEdit.value = event.time;
                        repeatCheckboxEdit.value = event.repeat;
 //                       publicCountdownEdit.value = event.public;

                        editEventMenu.style.display = 'block';

                        document.getElementById("submitEventButtonEdit").addEventListener("click", function () {
                            submitEditEvent(index);
                        });
                    }
                    //    removeEvent(index);
                });

                // Append countdown content and delete icon to countdown item
                countdownItem.appendChild(countdownContent);
                countdownItem.appendChild(editIcon);
                countdownItem.appendChild(deleteIcon);



                // Append countdown item to countdown list
                countdownList.appendChild(countdownItem);


                updateCountdown(event, detailsElement);

                // Update countdown every second
                setInterval(function () {
                    updateCountdown(event, detailsElement);
                }, 1000);
            });
        } else {
            // Handle case where no countdowns are stored
        }
    });
}


/**
 * Allows the countdowns to desplay real time ticking down
 * Reads whether or not an event is repeating and acts accordingly
 * @param {*} event 
 * @param {*} detailsElement 
 */
function updateCountdown(event, detailsElement) {
    // Calculate countdown time
    const eventDateTime = new Date(`${event.date}T${event.time}`);
    const currentTime = new Date();


    const isBirthday = event.isBirthday;

    // Calculate time difference in milliseconds
    let timeDifference = eventDateTime.getTime() - currentTime.getTime();

    // If the event is repeatable or it's a birthday, and the countdown has reached zero, reset it to the next occurrence
    if (event.repeat && timeDifference <= 0) {
        eventDateTime.setFullYear(eventDateTime.getFullYear() + 1);

        // Recalculate time difference
        timeDifference = eventDateTime.getTime() - currentTime.getTime();
    } else if (timeDifference <= 0 && !event.repeat) {
        detailsElement.textContent = '0 : 0 : 0 : 0 : 0';
        return;
    }

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Convert time difference to days, hours, minutes, seconds

    const daysRemaining = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    const hoursRemaining = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
    const secondsRemaining = Math.floor((timeDifference % (1000 * 60)) / 1000);

    // Calculate remaining months and adjust based on the day of the month
    let monthsRemaining = eventDateTime.getMonth() - currentTime.getMonth() +
        12 * (eventDateTime.getFullYear() - currentTime.getFullYear());

    if (eventDateTime.getDate() < currentTime.getDate()) {
        monthsRemaining--; // If the event day has passed for this month, decrement the months remaining
    }
    // Update details element with new countdown values
    detailsElement.textContent = `${monthsRemaining} : ${daysRemaining % 30} : ${hoursRemaining} : ${minutesRemaining} : ${secondsRemaining} `;
}


// Function to display the Birthday Menu
async function displayBirthdayMenu() {
    clearInput();
    const addNewOptions = document.getElementById('AddNewOptions');
    const birthdayMenu = document.getElementById('birthdayMenu');

    addNewOptions.style.display = 'none';
    birthdayMenu.style.display = 'block';
}

// Function to display the Event Menu
async function displayEventMenu() {
    const addNewOptions = document.getElementById('AddNewOptions');
    const eventMenu = document.getElementById('eventMenu');

    addNewOptions.style.display = 'none';
    eventMenu.style.display = 'block';
}

// Hides all the menus
function hideAllMenus() {
    const editBirthdayMenu = document.getElementById('editBirthdayMenu');
    const addNewOptions = document.getElementById('AddNewOptions');
    const birthdayMenu = document.getElementById('birthdayMenu');
    const eventMenu = document.getElementById('eventMenu');
    const eventMenuEdit = document.getElementById('editEventMenu');

    editBirthdayMenu.style.display = 'none';
    addNewOptions.style.display = 'none';
    birthdayMenu.style.display = 'none';
    eventMenu.style.display = 'none';
    eventMenuEdit.style.display = 'none';
}


/**
 * Adds a new item to the list of countdowns containing all the information.
 */
function submitBirthday() {
    const currentDate = new Date();

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // Adding 1 to get the correct month index
    const currentDay = currentDate.getDate();

    const title = document.getElementById('eventTitleBirthday').value;
    const birthdate = document.getElementById('eventDateBirthday').value;
    const birthDateParts = birthdate.split('-');
    let birthYear = parseInt(birthDateParts[0]); // Extract birth year from the input date
    const birthMonth = parseInt(birthDateParts[1]); // Extract birth month from the input date
    const birthDay = parseInt(birthDateParts[2]); // Extract birth day from the input date
    const time = '00:00';
    const repeat = true;
 //   const isPublic = document.getElementById('publicCountdownBirthday').checked;
    const isBirthday = true;

    let age = currentYear - birthYear;
    if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
        age--; // Decrease age if the birthday hasn't occurred yet this year
    }


    // Pad single-digit month or day with leading zero
    const formattedBirthMonth = birthMonth < 10 ? '0' + birthMonth : birthMonth;
    const formattedBirthDay = birthDay < 10 ? '0' + birthDay : birthDay;

    // Check for errors using the checkForErrorsBday function
    if (checkForErrorsBday(new Date(`${birthYear}-${formattedBirthMonth}-${formattedBirthDay}`), currentDate, 'eventTitleBirthday')) {
        return;
    }

    birthYear = currentYear;
    if (currentMonth > birthMonth || (currentMonth === birthMonth && currentDay > birthDay)) {
        birthYear += 1; // Increment birth year by 1
    }

    const countdownDate = `${birthYear}-${formattedBirthMonth}-${formattedBirthDay}`;

    const eventData = {
        title: title,
        date: countdownDate,
        time: time,
        repeat: repeat,
   //     public: isPublic,
        isBirthday: isBirthday,
        age: age
    };

    storeEventData(eventData, function () {
        // After storing the event data, update the display
        displayStoredCountdowns();
    });

    clearInput(); // Clear input fields after submission
    hideAllMenus();
    setDefaultDate(); // Reset the date field
}

/**
 * Overwrites the current index with the updated version
 * @param {} eventIndex 
 */
function submitEditBirthday(eventIndex) {
    retrieveEventData(function (events) {

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // Adding 1 to get the correct month index
        const currentDay = currentDate.getDate();

        const title = document.getElementById('eventTitleBirthdayEdit').value;
        const birthdate = document.getElementById('eventDateBirthdayEdit').value;
        const birthDateParts = birthdate.split('-');
        let birthYearInput = parseInt(birthDateParts[0]); // Extract birth year from the input date
        const birthMonth = parseInt(birthDateParts[1]); // Extract birth month from the input date
        const birthDay = parseInt(birthDateParts[2]); // Extract birth day from the input date
        const time = '00:00';
        const repeat = true;
 //       const isPublic = document.getElementById('publicCountdownBirthday').checked;
        const isBirthday = true;


        if (eventIndex >= 0 && eventIndex < events.length) {

            let age = currentYear - birthYearInput;
            if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay <= birthDay)) {
                age--; // Decrease age if the birthday hasn't occurred yet this year
            }

            let birthYear = currentYear;

            // Pad single-digit month or day with leading zero
            const formattedBirthMonth = birthMonth < 10 ? '0' + birthMonth : birthMonth;
            const formattedBirthDay = birthDay < 10 ? '0' + birthDay : birthDay;

            if (checkForErrorsBday(new Date(`${birthYearInput}-${formattedBirthMonth}-${formattedBirthDay}`), currentDate, 'eventTitleBirthdayEdit')) {
                return;
            }



            if (currentMonth > birthMonth || (currentMonth === birthMonth && currentDay > birthDay)) {
                birthYear += 1; // Increment birth year by 1
            }
            const countdownDate = `${birthYear}-${formattedBirthMonth}-${formattedBirthDay}`;

            events[eventIndex].age = age;
            events[eventIndex].title = title;
            events[eventIndex].date = countdownDate;
 //           events[eventIndex].public = isPublic;

            chrome.storage.sync.set({ 'events': events }, function () {
                console.log('Event data updated:', events);
                // After updating the event data, re-display the stored countdowns
                displayStoredCountdowns();
            });

            hideAllMenus();
        }
    });
}


/**
 * Handles the submit event when the submit button is clicked in the event menu
 */
function submitEvent() {

    // Get the current time
    const currentDate = new Date();
    const currentDateTime = currentDate.getTime();

    const title = document.getElementById('eventTitle').value;
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;
    const repeat = document.getElementById('repeatCheckbox').checked;
//    const isPublic = document.getElementById('publicCountdown').checked;
    const isBirthday = false;

    const selectedDateTimeString = `${date} ${time}`;
    const selectedDateTime = new Date(selectedDateTimeString).getTime();


    if (checkForErrors(selectedDateTime, currentDateTime, 'eventTitle')) {
        return;
    }


    const eventData = {
        title: title,
        date: date,
        time: time,
        repeat: repeat,
  //      public: isPublic,
        isBirthday: isBirthday

    };

    storeEventData(eventData, function () {
        // After storing the event data, update the display
        displayStoredCountdowns();
    });
    clearInput();
    hideAllMenus();
    setDefaultDate();
}

/**
 * Overwrites the current index with the updated Event
 */
function submitEditEvent(eventIndex) {
    retrieveEventData(function (events) {

        // Get the current time
        const currentDate = new Date();
        const currentDateTime = currentDate.getTime();

        const title = document.getElementById('eventTitleEdit').value;
        const date = document.getElementById('eventDateEdit').value;
        const time = document.getElementById('eventTimeEdit').value;
        const repeat = document.getElementById('repeatCheckboxEdit').checked;
 //       const isPublic = document.getElementById('publicCountdownEdit').checked;
        const isBirthday = false;

        const selectedDateTimeString = `${date} ${time}`;
        const selectedDateTime = new Date(selectedDateTimeString).getTime();


        if (checkForErrors(selectedDateTime, currentDateTime, 'eventTitleEdit')) {
            return;
        }

        events[eventIndex].title = title;
        events[eventIndex].date = date;
        events[eventIndex].time = time;
        events[eventIndex].repeat = repeat;
 //       events[eventIndex].public = isPublic;


        chrome.storage.sync.set({ 'events': events }, function () {
            console.log('Event data updated:', events);
            // After updating the event data, re-display the stored countdowns
            displayStoredCountdowns();
        });
        hideAllMenus();
    });

}

// Function to store event data
function storeEventData(eventData, callback) {
    chrome.storage.sync.get('events', function (data) {
        let events = data.events || [];
        events.push(eventData);
        chrome.storage.sync.set({ 'events': events }, function () {
            console.log('Event data saved:', eventData);
            // Call the callback function to trigger the update of the display
            if (typeof callback === 'function') {
                callback();
            }
        });
    });
}

// Function to retrieve stored event data
function retrieveEventData(callback) {
    chrome.storage.sync.get('events', function (data) {
        const events = data.events || [];
        callback(events);
    });
}

// Function to remove a specific event
function removeEvent(indexToRemove) {
    chrome.storage.sync.get('events', function (data) {
        let events = data.events || [];
        if (indexToRemove >= 0 && indexToRemove < events.length) {
            events.splice(indexToRemove, 1);
            chrome.storage.sync.set({ 'events': events }, function () {
                console.log('Event removed at index', indexToRemove);
                // After removing the event, re-display the stored countdowns
                displayStoredCountdowns();
            });
        }
    });
}

// Function to print the list items to console.log
function printStoredEventData() {
    chrome.storage.sync.get('events', function (data) {
        const events = data.events;
        if (events && events.length > 0) {
            console.log('Stored Event Data:');
            console.log(events);
        } else {
            console.log('No event data found.');
        }
    });
}


/**
 * Before submitting an event, checks to see if the date fits withing the peramiters
 * Currently doesn't have a year too late, It will count to 2500 if you let it
 * @param {*} selectedDateTime 
 * @param {*} currentDateTime 
 * @param {*} eventTitle 
 */
function checkForErrors(selectedDateTime, currentDateTime, eventTitle) {
    let areErrors = false;
    let errorMessages = [];
    if (selectedDateTime <= currentDateTime) {
        areErrors = true;
        errorMessages.push("Please select a date and time after the current date and time.");
    }
    if (!document.getElementById(eventTitle).value.trim()) { // Check if title is empty
        areErrors = true;
        errorMessages.push("Please enter a title.");
    }
    if (areErrors) {
        makeErrorPrint(errorMessages);
        return true;
    }
}

/**
 * Before submitting a birthday, check to see if the person isn't a negitive age or have no name
 * @param {*} selectedDateTime 
 * @param {*} currentDateTime 
 * @param {*} eventTitle 
 */
function checkForErrorsBday(selectedDateTime, currentDateTime, eventTitle) {
    console.log(selectedDateTime, currentDateTime);
    let areErrors = false;
    let errorMessages = [];
    if (selectedDateTime >= currentDateTime) {
        areErrors = true;
        errorMessages.push("Please select a date and time before the current date and time.");
    }
    if (!document.getElementById(eventTitle).value.trim()) { // Check if title is empty
        areErrors = true;
        errorMessages.push("Please enter a title.");
    }
    if (areErrors) {
        makeErrorPrint(errorMessages);
        return true;
    }
}

// Combines the errors found into one message for printing
async function makeErrorPrint(errors) {
    const errorMessageString = errors.join("\n");
    console.log(errorMessageString);
    const message = 'Error:\n' + errorMessageString;
    showPopupMessage(message);
    return true;
}

// If an error is found, show a popup to the user telling them there's an error
async function showPopupMessage(message) {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (message) => {
            alert(message);
        },
        args: [message]
    });
}



// After submitting an event, clear the input fields so they're clean for the next submission
function clearInput() {
    // Clear input fields after submission
    setDefaultDate();
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventTitleBirthday').value = '';
    document.getElementById('eventTitleBirthdayEdit').value = '';
    document.getElementById('eventTime').value = '00:00';


    document.getElementById('repeatCheckbox').checked = false;
//    document.getElementById('publicCountdown').checked = false;
//    document.getElementById('publicCountdownBirthday').checked = false;

}

// Sets the default date when submitting an event to the current date, for convienence
function setDefaultDate() {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    let month = currentDate.getMonth() + 1; // Add 1 because getMonth() returns 0-based index
    let day = currentDate.getDate();

    // Pad single-digit month or day with leading zero
    if (month < 10) {
        month = '0' + month;
    }
    if (day < 10) {
        day = '0' + day;
    }

    const defaultDate = `${year}-${month}-${day}`;
    document.getElementById('eventDate').value = defaultDate;
    document.getElementById('eventDateBirthday').value = defaultDate;
    return defaultDate;
}




// Functions that handle the light mode -----------

function loadLightModeState() {
    chrome.storage.sync.get('isColorAlt', function (data) {
        if (data.isColorAlt !== undefined) {
            isColorAlt = data.isColorAlt;
            changeLightMode(); // Apply the saved light mode
        }
    });
}
let isColorAlt = false;
function changeLightMode() {
    console.log("Changed Light Mode");
    if (isColorAlt) {

        document.documentElement.style.setProperty('--text-color', '#b4bcbf');
        document.documentElement.style.setProperty('--button-color', '#3f4546');
        document.documentElement.style.setProperty('--background-color', '#1c2021');
        document.documentElement.style.setProperty('--popup-color', '#313739');
        document.documentElement.style.setProperty('--input-text-color', '#ffffff');
        document.documentElement.style.setProperty('--extra-detail', '#5b6465');
        document.documentElement.style.setProperty('--invert-level', '.3');
        document.documentElement.style.setProperty('--brightness-level-Countdown', '1');
        document.documentElement.style.setProperty('--addNew-color', '1');
        document.documentElement.style.setProperty('--logo-opacity', '0.2');
        saveLightModeState();


    } else {
        // Light mode colors
        document.documentElement.style.setProperty('--text-color', '#575757');
        document.documentElement.style.setProperty('--button-color', '#ffffff');
        document.documentElement.style.setProperty('--background-color', '#ffffff');
        document.documentElement.style.setProperty('--popup-color', '#edeff0');
        document.documentElement.style.setProperty('--input-text-color', '#000000');
        document.documentElement.style.setProperty('--extra-detail', '#a6abac');
        document.documentElement.style.setProperty('--invert-level', '.8');
        document.documentElement.style.setProperty('--brightness-level-Countdown', '.5');
        document.documentElement.style.setProperty('--addNew-color', '3');
        document.documentElement.style.setProperty('--logo-opacity', '0.05');
        saveLightModeState();

    }
    isColorAlt = !isColorAlt;
}
function saveLightModeState() {
    chrome.storage.sync.set({ 'isColorAlt': isColorAlt });
}


