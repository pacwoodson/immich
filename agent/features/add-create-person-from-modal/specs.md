# Feature Specification: Add Create Person from Modal

## User Specification

### Problem Statement
When users are tagging faces in the asset viewer, they often need to create new people that don't exist in their library yet. Currently, users have to exit the face editor modal, navigate to the people management section, create a new person, and then return to tag the face. This creates a poor user experience with multiple steps and context switching.

### User Story
As a user viewing photos in the asset viewer, I want to be able to create a new person directly from the face editor modal when I can't find an existing person to tag, so that I can quickly and efficiently organize my photo library without leaving the current workflow.

### Acceptance Criteria
1. When searching for a person in the face editor modal, if no matching person is found, a "Create person {name}" button should appear
2. Clicking the create button should create a new person with the entered name
3. The face should be automatically tagged to the newly created person
4. The new person should appear in the people list immediately
5. The modal should provide keyboard navigation (Enter to create/select, Escape to cancel)
6. The search input should be auto-focused when the modal opens
7. The feature should work in all supported languages

## Technical Specification

### Overview
This feature enhances the existing face editor modal in the asset viewer to allow creating new people directly from the modal interface. It integrates with the existing person management and face tagging systems.

### Architecture

#### Frontend Components
- **Asset Viewer** (`web/src/lib/components/asset-viewer/asset-viewer.svelte`)
  - Manages the overall asset viewing experience
  - Handles face edit mode state

- **Face Editor** (`web/src/lib/components/asset-viewer/face-editor/face-editor.svelte`)
  - Core component for face tagging functionality
  - Handles person search and selection
  - Manages person creation workflow

#### State Management
- **Face Edit Mode Store** (`$lib/stores/face-edit.svelte`)
  - Controls the face editing state
  - Resets when asset viewer is closed

- **Asset Viewing Store** (`$lib/stores/asset-viewing.store`)
  - Manages current asset being viewed
  - Triggers asset refresh after face tagging

#### API Integration
- **Person Management**
  - `createPerson()` - Creates new person with name
  - `updatePerson()` - Updates person with featured photo
  - `getAllPeople()` - Retrieves list of existing people

- **Face Management**
  - `createFace()` - Tags face to person with coordinates

### Implementation Details

#### 1. Enhanced Search Functionality
```typescript
// Derived state to show create button when no match found
let shouldShowCreateButton = $derived(
  searchTerm.trim() && !candidates.some((person) => 
    person.name.toLowerCase() === searchTerm.trim().toLowerCase()
  ),
);
```

#### 2. Person Creation Workflow
```typescript
const createNewPerson = async () => {
  // 1. Get face coordinates
  const faceCoordinates = getFaceCroppedCoordinates();
  
  // 2. Create new person
  const newPerson = await createPerson({
    personCreateDto: { name: searchTerm.trim() }
  });
  
  // 3. Tag face to new person
  await createFace({
    assetFaceCreateDto: {
      assetId,
      personId: newPerson.id,
      ...faceCoordinates,
    },
  });
  
  // 4. Set featured photo
  await updatePerson({
    id: newPerson.id,
    personUpdateDto: { featureFaceAssetId: assetId }
  });
  
  // 5. Update UI
  candidates = [...candidates, newPerson];
  searchTerm = '';
  await assetViewingStore.setAssetId(assetId);
};
```

#### 3. Keyboard Navigation
```typescript
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    if (selectedPerson) {
      tagFace(selectedPerson);
    } else if (shouldShowCreateButton) {
      createNewPerson();
    }
  } else if (event.key === 'Escape') {
    cancel();
  }
};
```

#### 4. Auto-focus Implementation
```typescript
onMount(async () => {
  // Focus search input when modal opens
  setTimeout(() => {
    const inputElement = faceSelectorEl?.querySelector('input');
    if (inputElement) {
      inputElement.focus();
    }
  }, 200);
});
```

### UI/UX Design

#### Visual Feedback
- Selected person in the list is highlighted with `bg-immich-primary/25`
- Create button has ring styling when no person is selected
- Clear visual hierarchy between existing people and create option

#### Responsive Behavior
- Modal adapts to different screen sizes
- Scrollable people list with fixed height
- Button states change based on selection and search results

### Internationalization

#### Translation Keys
- `create_person_with_name`: "Create person {name}" (English)
- `create_person_with_name`: "Crear persona {name}" (Spanish)

#### Implementation
```svelte
{$t('create_person_with_name', { values: { name: searchTerm.trim() } })}
```

### Error Handling

#### Validation
- Check for valid face coordinates before creating person
- Validate search term is not empty
- Handle API errors gracefully

#### User Feedback
- Error notifications for failed operations
- Loading states during API calls
- Success feedback through UI updates

### Performance Considerations

#### Optimizations
- Debounced search to avoid excessive API calls
- Efficient state updates using Svelte's reactive system
- Minimal re-renders through proper state management

#### Caching
- People list is cached in component state
- Newly created people are added to the cache immediately

### Security

#### Input Validation
- Sanitize person names before creation
- Validate face coordinates are within image bounds
- Ensure proper asset ownership before tagging

#### API Security
- Use existing authentication and authorization
- Validate user permissions for person creation
- Ensure face coordinates are legitimate

### Testing Strategy

#### Unit Tests
- Test person creation workflow
- Test keyboard navigation
- Test search functionality
- Test error handling

#### Integration Tests
- Test modal integration with asset viewer
- Test API integration
- Test state management

#### User Acceptance Tests
- Test complete workflow from face selection to person creation
- Test keyboard navigation
- Test internationalization
- Test error scenarios

### Dependencies

#### Frontend Dependencies
- `@immich/sdk` - API client for person and face management
- `@immich/ui` - UI components (Button, Input)
- `fabric.js` - Canvas manipulation for face coordinates

#### Backend Dependencies
- Person management API endpoints
- Face tagging API endpoints
- Asset management system

### Migration and Deployment

#### Database Changes
- No database schema changes required
- Uses existing person and face tables

#### Configuration
- No additional configuration required
- Feature is enabled by default

#### Rollback Plan
- Feature can be disabled by reverting frontend changes
- No data migration required for rollback

### Future Enhancements

#### Potential Improvements
- Bulk person creation for multiple faces
- Person name suggestions based on existing names
- Integration with external person databases
- Advanced face recognition suggestions

#### Scalability Considerations
- Handle large numbers of people efficiently
- Optimize search performance
- Consider pagination for people list 