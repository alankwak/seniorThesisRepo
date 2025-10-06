# Senior Thesis Repo: Tab-Sharing Browser Extension (Name WIP)

## Introduction

### Purpose
The purpose of this document is to outline the functional and non-functional requirements of my senior thesis project, which is a browser extension that allows users to share tabs between devices (Name WIP). The extension is designed to streamline the task of shared web browsing, when multiple users are using the web to accomplish a shared goal. 

The key goals of the extension are:
- To allow users to easily share their tabs/urls with other users.
- To provide functionality for a variety of use cases, such as shared online shopping or teaching using a web page.
- To prioritize ease-of-use for users using intuitive and user-friendly design as well as simple setup and low latency.

### Scope
This extension is designed to provide a foundational platform for a variety of use cases and tasks. This foundation consist of:
- Session creation using a room code and optional password.
- Assignment of privileges to users in a session. 
- A visual display containing the users connected to a session and the tabs that they are sharing.
- A history of sessions and session tabs for easy recollection or additions to browsing sessions.
- An optional follow-along mode, allowing a user's changes to update to other users' browsers in real time.

### Definitions, Acronyms, and Abbreviations
- \[ph\]

## Overview
The tab-sharing extension serves as an easier way of allowing two or more users to share their browsing tabs with each other. It allows users to create and join sessions, add or remove tabs to the shared session, view tabs in the shared session, and follow along to another user's web browsing.

### System Features:
1. **Create a Session**: Allows a user to create a new shared tab session and designates that user as the session leader. The user has the option to select existing tabs to add to the session or to create a new blank tab.
2. **Share Current Session**: Users can create a session code (with optional password) and share that code with other users.
3. **Join Existing Session**: Users can input a session code (and password, if required) to join a session if it is currently active.
4. **Designate User Permissions**: The session leader has the option to designate permissions (collaborator, view-only) for each individual user connected to the session.
5. **Add/Remove Tab(s) from Session**: Users with the collaborator role can choose tabs on their own machine to add or remove from the shared session.
6. **View Session Tabs**: Users connected to a session can open a sidebar where they can see all of the shared tabs in the session, organized by the collaborator who shared them.
7. **End Session**: The session leader can end a session, disconnecting all users and saving the tab history into each user's "recent sessions" list.
8. **Follow-Along**: If possible, collaborators can iniatiate a "follow-along" mode that automatically syncs their tabs with other users in the session.

The following sections detail the specific use cases that the system will support.

## Use Cases

### Use Case 1.1: Create a Session
- **Actors**: A single user.
- **Overview**: User starts a shared tab session.

**Typical Course of Events**:
1. User clicks a "Create Session" button from the extension dropdown or sidebar
2. Run Use Case 1.5, *Add/Remove Tab(s) from Session*
3. The session is created in the user's browser, and the user is prompted to perform Use Case 1.2, *Share Current Session*

### Use Case 1.2: Share Current Session
- **Actors**: A session leader (creator).
- **Overview**: A session creator makes their session joinable by other users.

**Typical Course of Events**:
1. Run Use Case 1.1, *Create a Session*
2. User clicks a share/publish session button
3. User is prompted to select whether or not the session should be password protected. If yes, user enters a password
4. User is prompted to select the default permission level of users who join the session (collaborator, view-only). By default, this option is collaborator
5. User clicks "share" button, which generates a unique session code that other users can use to join the session

**Alternative Courses**:
- **Step 5**: User selected the session should be password protected in *Step 3* but no password was provided.
  1. Displays an error prompting the user to add a password or deselect password protection for their session before allowing them to perform the step

### Use Case 1.3: Join Existing Session
- **Actors**: A user.
- **Overview**: A user enters a session code to join an existing session.

**Typical Course of Events**:
1. User clicks a "join session" button from the extension drop-down or sidebar
* 2.1 User enters the session code of the session they want to join
* 2.2 If the session is password protected, user enters the password of the session they want to join
3. User clicks final "join" button, which connects them to the session.
4. User is assigned the default session role

**Alternative Courses**:
- **Step 2**: Session code or password is invalid or incorrect.
  1. Displays an error
  2. Returns to step 2

### Use Case 1.4: Designate User Permissions
- **Actors**: A session leader/creator.
- **Overview**: The session leader/creator changes the role (collaborator, view-only) of another user in the session.

**Typical Course of Events**:
1. Session leader opens a list of connected users
2. Session leader finds the user whose permissions they want to change in the list
3. Next to the user's name, the session leader uses a dropdown to change the user's role.
4. Session leader clicks "save" button
5. The system applies the updated permission to the chosen user

### Use Case 1.5: Add/Remove Tab(s) from Session
- **Actors**: A user with the collaborator role.
- **Overview**: A collaborator adds or removes one or more tabs from the tabs that they are sharing to the session.

**Typical Course of Events**:

There will ideally be many ways to perform this use case.

**Option 1** (Adding Tabs)
1. User clicks an "add tabs to session" button
2. User is prompted with a menu showing all of their tabs that are not already part of the session
3. User selects tabs they want to add, or can select a new blank tab
4. User clicks "ok"

**Alternative Courses**:
- **Step 4**: User selects okay, but no tabs were selected in *step 3*
  1. Make no changes to the user's shared tabs

**Option 2** (Adding Tabs)

*Precondition*: the user already has tabs that they are sharing in the browser

1. Assuming the shared tab group for each user works like regular tab groups on Chrome, the user drags a tab they want to add into the shared tab group on the upper tab-bar

**Option 1** (Removing Tabs) 
1. User clicks a "remove tabs to session" button
2. User is prompted with a menu showing all of their tabs that are already part of the session
3. User selects tabs they want to remove
4. User clicks "ok"

**Alternative Courses**:
- **Step 4**: User selects ok, but no tabs were selected in *step 3*
  1. Make no changes to the user's shared tabs

**Option 2** (Removing Tabs)

1. Assuming the shared tab group for each user works like regular tab groups on Chrome, the user drags a tab they want to remove out of the shared tab group on the upper tab-bar

**Option 3** (Removing Tabs)

1. User closes a tab that is currently part of the shared tab group

### Use Case 1.6: View Session Tabs
- **Actors**: A user.
- **Overview**: A user checks which tabs are currently being shared, and by who.

**Typical Course of Events**:
1. User opens a sidebar from the extension, which lists each user and the tabs that they are sharing
2. User can click on a tab to open it in their browser

### Use Case 1.7: End Session
- **Actors**: Session leader/creator.
- **Overview**: The session leader/creator ends the shared tab session, disconnecting all connected users and saving a snapshot of the session to each user's "recent sessions."

**Typical Course of Events**:
1. Session leader opens the extension sidebar or dropdown
2. Session leader clicks "end session" button
3. Session leader confirms they want to end the session
4. Every user in the session is disconnected, and the session code is freed up for use by other sessions
5. Every user is prompted to select the tabs they would like to keep open in the browser from all tabs that were part of the session
6. Every user is prompted to select whether the session tabs are saved to a user-specific history of "recent sessions"

### Use Case 1.8: Follow-Along Mode
- **Actors**: A user with the collaborator role.
- **Overview**: Collaborators can activate "follow-along" mode, which mirrors the user's actions on their own browser to a shared tab group on the other connected users' browsers.

**Typical Course of Events**:
1. Collaborator activates "follow-along" mode from a button on the extension dropdown or sidebar
2. Other users in the session see the collaborator as being in "follow-along" mode via a notification or icon next to their name
3. Other users can choose to "follow" the collaborator in follow-along mode, which opens a new tab group with all of the collaborator's tabs.
4. As the collaborator updates their tabs, i.e. by performing Use Case 1.5 or entering in a new url on an existing tab, the tabs are updated for the other users

**Alternative Courses**:
- User "unfollows" a collaborator in follow-along mode.
  1. User presses an "unfollow" button
  2. The changes from the collaborator's tabs stop being mirrored to the user's tabs
  3. The user is prompted to select tabs from the follow-along mode they would like to keep open (similar to Use Case 1.7, *End Session*)

- Collaborator exits follow-along mode
  1. Collaborator clicks a "stop sharing" or "exit follow-along mode" button
  2. Each user "following along" is taken through steps 2-3 for "User unfollows a collaborator in follow-along mode"
