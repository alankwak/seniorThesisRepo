## Week 1 Summary (09/08/2025-09/15/2025)

### This week I worked on:

* I tried to brainstorm project ideas, such as an app that allows users to create their own objects and then pack them into a 3D space such as a box. I am not 100% set on this idea, but I think it would be cool to make and could include a lot of different technologies (computer vision/LIDAR for item creation, bin packing in a new computational language (e.g. Rust), a new web framework (e.g. Angular)).
* I probably worked for about 2 hours this week, which is less than I would have liked to. This is mostly because I was in the process of finalizing the topic for my math thesis. I should be able to work more on this project next week. I would also like to come up with some other ideas to consider besides the packing app.

### This week I learned:

* I learned about Apple's built-in object scanning on iPhones.

### My successes this week were:

* I have a pretty good idea of what I might do to create a packing app, though I'd like to come up with some other ideas as well.

### The challenges I faced this week were:

* I didn't have many challenges this week other than the uncertainty that comes with brainstorming.

---

## Week 2 Summary (09/15/2025-09/22/2025)
### This week I worked on:

* My plans for this week were pretty much upended following the event of me learning that you need a Mac to really do any kind of iPhone app development. I don't know how I didn't realize this before, but this essentially blocks me from testing one of the main features of my proposed bin-packing app: 3D scanning items to easily add them to a packing list. This is because I own an iPhone, and would thus not be able to easily test any camera functionality on a mobile app. I am open to making modifications to the packing concept that I could realistically develop, but I honestly think the app is better suited to mobile than desktop/web so I decided to research other project ideas.
* One idea I thought of was essentially a way to share tabs across browsers of different users, which I think would be useful for things like group research projects so everyone can navigate to an article of interest without having to manually share links. It could also be cool as a group shopping tool so people in a group can easily find products that other group members are interested in. I would probably implement this through a browser extension.
    * I don't know if this is enough for a senior project, and I need to come up with additional features

### This week I learned:

* I spent a little bit of time researching if this new idea is actually possible as a browser extension, and it seems like it is. It might require a back end to actually route requests to the correct browsers, though.

### My successes this week were:

* Despite realizing my packing idea isn't feasible for me to make since I can't really develop for iPhone, I came up with a new idea that I still think is cool.

### The challenges I faced this week were:

* I was sick for a majority of the week, so I didn't have the energy to do much research.
* I also had to come up with a new idea for a project, which came with a bit of frustration trying to find an idea that I thought was cool and had not been overdone.

---

## Week 3 Summary (09/22/2025-09/29/2025)
### This week I worked on:

* I met with Professor Mahoney and pitched the tab-sharing extension idea. He said it sounded good.
* I wrote the most essential use-cases for the tab-sharing extension in ```README.md```.

### This week I learned:

* I learned how to write use cases for a project idea.

### My successes this week were:

* I finalized a project idea and made progress by writing use cases for it.

### The challenges I faced this week were:

* I did not feel I had any challenges this week.

---

## Week 4 Summary (09/29/2025-10/06/2025)
### This week I worked on:

* I updated ```README.md``` with an additional product overview (adding to the use-cases I wrote last week).
* I did some preliminary research into developing a chrome extension.

### This week I learned:

* I learned that I will probably be using the Chrome .tabs API the most for this project, and that Chrome has a built-in sidebar that extensions can use.

### My successes this week were:

* I made steady progress on my project.

### The challenges I faced this week were:

* I did not feel I had any challenges this week.

---

## Week 5 Summary (10/06/2025-10/13/2025)
### This week I worked on:

* To be honest, I did not work much on my project this week. I was busy with tests in other classes and interview prep for internships.
* I did watch a short video about how to create a basic chrome extension and then test it using Chrome's developer mode for extensions.

### This week I learned:

* I learned how to test a custom chrome extension locally without actually publishing it. I have a feeling testing my extension will be a little more involved since the functionality is based on multiple machines but it might be as simple as just running the same development extension on the otehr machine at the same time.

### My successes this week were:

* I learned how to test a custom chrome extension.

### The challenges I faced this week were:

* I had trouble finding time to work on this project among various other projects and responsibilities I had this week.

---

## Week 6 Summary (10/13/2025-10/20/2025)
### This week I worked on:

* I created a test extension that changes all of the images on my portfolio webpage with a picture of my dog. This helped me understand how content scripts are used in extensions, though I think the majority of my extension will use service workers instead of content scripts since I am not changing anything on the actual websites.

### This week I learned:

* I learned the difference between service workers and content scripts in a browser extension.
* I also learned how to make a barebones content script.

### My successes this week were:

* I successfully made my first browser extension, even though it is really small and doesn't do much.

### The challenges I faced this week were:

* I did not feel I faced any challenges this week.

---

## Week 7 Summary (10/20/2025-10/27/2025)
### This week I worked on:

* I created a very simple extension that allows the user to open a sidebar and click a button to create a session. This also required making a backend server to process the session create request and create a session code. Right now, the code is random, but I might make it sequential so that it is easier to guarantee that no two active sessions have the same session code.
* Currently, the data on the server is stored using SQLite. I would like to update it to a dedicated DB server like Postgres but that is not my main priority right now.
* I also fiddled around with the Chrome identity API to see if I could assign user ids in the DB from the user's logged in Google account. It turns out this feature only works on published extensions. Therefore, I will probably have to design my own login system if I want to store user-based data. Right now, the backend server assigns a user id to new requests, which then gets stored in the browser's local storage for future requests (just so I can get accurate user-based data in the DB for testing).

### This week I learned:

* I learned some more about the Chrome browser APIs.
* I also freshened up on my web development skills.

### My successes this week were:

* I was able to connect the frontend extension to a backend server to process logic and store data. I also started work on the actual extension, rather than the demo extension I tried out last week.

### The challenges I faced this week were:

Without really taking the time to plan out an overall system architecture and DB relationships, it was kind of difficult to understand where I should focus development to start. I think I might work on this topic next week.

---

## Week 8 Summary (10/27/2025-11/03/2025)
### This week I worked on:

* I did some more research into existing backend server technologies to facilitate online "sessions" between users. One thing that came up was Redis pub/sub, but I after looking into it I don't think I will implement Redis to start because I don't plan on having more than one server to start. Otherwise, it seems like the server can just keep track of a hash map of session ids to connected users websockets in order and then use that session id + map in any future events to broadcast messages to other users in the session.
* I also worked on putting together a database ER diagram to better understand the information I need to store in the database and how queries might be written to get certain data on to the extension.

### This week I learned:

* I learned about Redis pub/sub (despite choosing not to use it at the moment), and more about how websockets are set up through node. 

### My successes this week were:

* I have a better idea of the underlying design that I plan to implement for the project.

### The challenges I faced this week were:

* It is still somewhat difficult to determine whether or not the features I have researched will be able to do what I want them to in the actual extension. I will figure more of this out next week, when I hopefully have time to go back to writing code.

---

## Week 9 Summary (11/03/2025-11/10/2025)
### This week I worked on:

* After all the previous weeks' work thinking about the backend, I had the itch to work on something different (i.e. the frontend). I used the ```chrome.tabs``` and ```chrome.tabGroups``` APIs to start messing around with how to actually manipulate tabs and tab groups in the browser. I was able to create a button that created a new tab in the browser and automatically put it into its own group.

### This week I learned:

* I learned more about Chrome APIs and how to manipulate tabs and tab data in the browser.

### My successes this week were:

* I now have more tangible progress towards my actual project.

### The challenges I faced this week were:

* I did not feel I faced any significant challenges this week.

---

## Week 10 Summary (11/10/2025-11/17/2025)
### This week I worked on:

* I worked more on the frontend of my extension, including the design and logic. You are now able to add any currently open tabs to the tab group using the extension, and the tabs that are open in the tab group now appear in the sidebar. There is also a bunch more logic with the tab group that means it will continue to work even if the user messes with it via normal tab group actions in the browser (i.e. dragging tabs in/out of the group, dragging the group out of the window, closing the group, etc).
* Eventually, I am hoping the same event listeners I used to keep track of the open tabs in the group can be used to send the tab data to the backend server so it can share the data with other connected users.

### This week I learned:

* I learned EVEN MORE about Chrome APIs and how to manipulate tabs in the browser.

### My successes this week were:

* I think I have a very solid base for the local functionality of the extension. I hope that this base will make it easy for me to test the backend functionality.

### The challenges I faced this week were:

* I did not feel I faced any significant challenges this week (though there was the normal struggles of trying to find the CSS styles I wanted to use and debugging across multiple event handlers in different files).

---

## Week 11 Summary (11/17/2025-11/24/2025)
### This week I worked on:

* I started work on the backend of the extension, mainly creating a route to create and store a session on the server. In order to test this, I also created a custom ```SessionHandler``` component to manage creating, joining, and leaving sessions on the frontend.

### This week I learned:

* I wouldn't say I learned anything new, but I did refresh my knowledge on custom HTML web components.

### My successes this week were:

* After dealing with preserving the state of the list of tabs in the sidebar, it was way easier for me to figure out how to preserve the state of the ```SessionHandler``` component. 
* Since the component appears in both the popup and sidebar windows, I also figured out how to automatically change the state of the other instance of the component when both windows are open and the state is changed.

### The challenges I faced this week were:

* My biggest challenge was probably figuring out how to implement success #2.

---

## Week 12 Summary (11/24/2025-12/01/2025) - BREAK
### This week I worked on:

[Your answer here]

### This week I learned:

[Your answer here]

### My successes this week were:

[Your answer here]

### The challenges I faced this week were:

[Your answer here]

---

## Week 13 Summary (MM/DD/YYYY)
### This week I worked on:

[Your answer here]

### This week I learned:

[Your answer here]

### My successes this week were:

[Your answer here]

### The challenges I faced this week were:

[Your answer here]

---
