'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;

    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // this.type = 'cycling';
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Running([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

//////////////////////////////////////////////
// APLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.edit-workout');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const editForm = document.querySelector('.edit-form');
const editWorkout = document.querySelector('.edit-workout');
const editContainerWorkouts = document.querySelector('.edit-workouts');
const editInputType = document.querySelector('.edit-form__input--type');
const editInputDistance = document.querySelector('.edit-form__input--distance');
const editInputDuration = document.querySelector('.edit-form__input--duration');
const editInputCadence = document.querySelector('.edit-form__input--cadence');
const editInputElevation = document.querySelector(
  '.edit-form__input--elevation'
);
const deleteBtn = document.querySelector('.delete-form__btn');
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #editWorkout;
  constructor() {
    // Get user's position
    this._getPosition();
    // Get data from local storage
    this._getLocalStorage();
    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this._showEditForm.bind(this));
    //prettier-ignore
    deleteBtn.addEventListener('click', this._removeLocalStorageItem.bind(this));
    editForm.addEventListener('submit', this._editLocalStorageItem.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _showEditForm(e) {
    editForm.classList.remove('hidden');
    editInputDistance.focus();
    const workoutEl = e.target.closest('.workout');
    this.#editWorkout = workoutEl;
    if (!workoutEl) return;
    e.preventDefault();
    // const data = JSON.parse(localStorage.getItem('workouts'));
    const data = this.#workouts.find(el => el.id === workoutEl.dataset.id);
    this.#editWorkout = data;
    console.log(data);
    console.log(data.type);

    editInputType.value = data.type;
    editInputDistance.value = data.distance;
    editInputDuration.value = data.duration;

    if (data.type === 'running') {
      editInputType.value = data.type;
      editInputCadence.value = data.cadence;
      editInputElevation
        .closest('.edit-form__row')
        .classList.add('edit-form__row--hidden');
      editInputCadence
        .closest('.edit-form__row')
        .classList.remove('edit-form__row--hidden');
    }
    if (data.type === 'cycling') {
      editInputType.value = data.type;
      editInputElevation.value = data.elevationGain;
      editInputCadence
        .closest('.edit-form__row')
        .classList.add('edit-form__row--hidden');
      editInputElevation
        .closest('.edit-form__row')
        .classList.remove('edit-form__row--hidden');
    }
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.remove('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1500);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + Clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
        <button>✏️</button>
      </li>
        `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
            </div>
            <button>✏️</button>
        </li>
    `;

    editWorkout.insertAdjacentHTML('beforeend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1.5,
      },
    });
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    // Restoring the data
    this.#workouts = data;

    this.#workouts.forEach(work => this._renderWorkout(work));
  }

  _editLocalStorageItem(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();
    const data = this.#editWorkout;
    console.log(data);

    const distance = +editInputDistance.value;
    const duration = +editInputDuration.value;
    // If workout running, create running object
    if (data.type === 'running') {
      const cadence = +editInputCadence.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      data.distance = distance;
      data.duration = duration;
      data.cadence = cadence;
      data.pace = data.duration / data.distance;
    }
    // If workout cycling, create cycling object
    if (data.type === 'cycling') {
      const elevation = +editInputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');
      data.distance = distance;
      data.duration = duration;
      data.elevation = elevation;
      data.speed = data.distance / (data.duration / 60);
    }
    this._setLocalStorage();
    location.reload();
  }

  _removeLocalStorageItem(e) {
    e.preventDefault();
    // Get the workout element that was clicked
    const workoutEl = this.#editWorkout;
    console.log(workoutEl);
    // Get the workouts data from local storage
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);
    // Find the index of the workout to remove in the data array
    let index = data.findIndex(el => el.id === workoutEl?.id);

    // Display a confirmation message to the user before deleting
    const confirmation = confirm(
      'Are you sure you want to delete this workout?'
    );
    if (confirmation) {
      // Remove the workout from the data array
      if (index !== -1) {
        data.splice(index, 1);
      }

      // Update the workouts array in the class instance and local storage
      this.#workouts = data;
      this._setLocalStorage();

      // Reload the page to reflect the changes
      location.reload();
    }
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
