# Feature Status: Add Create Person from Modal

## Feature Description
This feature adds the ability to create a new person directly from the face editor modal when tagging faces in the asset viewer. Users can now search for existing people, and if no match is found, they can create a new person with the entered name.

## Files Changed

### 1. i18n/en.json
- **Added**: `"create_person_with_name": "Create person {name}"` - New translation key for the create person button

### 2. i18n/es.json  
- **Added**: `"create_person_with_name": "Crear persona {name}"` - Spanish translation for the create person button

### 3. web/src/lib/components/asset-viewer/asset-viewer.svelte
- **Added**: Import for `isFaceEditMode` store
- **Modified**: `closeViewer()` function to reset face edit mode when closing the viewer

### 4. web/src/lib/components/asset-viewer/face-editor/face-editor.svelte
- **Major Changes**:
  - Added `createPerson` and `updatePerson` imports from SDK
  - Added `selectedPerson` state variable for keyboard navigation
  - Added `shouldShowCreateButton` derived state to show create button when no matching person exists
  - Added keyboard event handling (`handleKeydown`) for Enter/Escape keys
  - Added `createNewPerson()` function to create new person with face
  - Modified `tagFace()` function to remove confirmation dialog and directly create face
  - Added auto-focus on search input when modal opens
  - Added visual feedback for selected person in the list
  - Added "Create person {name}" button that appears when no matching person is found
  - Enhanced UI with keyboard navigation support

## What Has Been Done

1. **User Experience Improvements**:
   - Users can now create new people directly from the face editor modal
   - Keyboard navigation support (Enter to select/create, Escape to cancel)
   - Auto-focus on search input for better UX
   - Visual feedback for selected person in the list

2. **Functionality**:
   - Search for existing people by name
   - Create new person if no match is found
   - Automatically tag the face to the newly created person
   - Set the new person's featured photo to the current asset
   - Update the candidates list to include the newly created person

3. **Internationalization**:
   - Added English and Spanish translations for the new create person functionality

4. **Code Quality**:
   - Proper error handling with user-friendly messages
   - Clean state management
   - Responsive UI updates

## Problems Detected

None detected. The implementation appears to be complete and functional.

## What Needs to Be Done

The feature appears to be complete and ready for merging. All necessary functionality has been implemented:

- ✅ Create person from modal
- ✅ Keyboard navigation
- ✅ Internationalization
- ✅ Error handling
- ✅ UI/UX improvements
- ✅ Integration with existing face tagging system

## Testing Recommendations

Before merging, the following should be tested:
1. Search for existing people and verify they appear in the list
2. Try to create a new person with a name that doesn't exist
3. Test keyboard navigation (Enter, Escape keys)
4. Verify the newly created person appears in the people list
5. Check that the face is properly tagged to the new person
6. Test in both English and Spanish locales 