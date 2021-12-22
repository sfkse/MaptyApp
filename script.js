'use strict';



const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
let inputType = document.querySelector('.form__input--type');
let inputDistance = document.querySelector('.form__input--distance');
let inputDuration = document.querySelector('.form__input--duration');
let inputCadence = document.querySelector('.form__input--cadence');
let inputElevation = document.querySelector('.form__input--elevation');
const deleteAll = document.querySelector('.delete__all');



class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);

    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance; //in km
        this.duration = duration; //in min
    }

    _setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
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
        this.pace = this.duration / this.distance;
        return this
    }
}
class Cycling extends Workout {

    type = 'cycling';

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed
    }
}
class App {
    #map;
    #mapEvent;
    #mapZoomLevel = 13;
    #workouts = [];

    constructor() {
        //Get user's position
        this._getPosition();

        this._getLocalStorage();
        //Attach event handlers
        form.addEventListener('submit', this._newWorkout.bind(this))
        inputType.addEventListener('change', this._toggleElevationField)
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this))
        deleteAll.addEventListener('click', this._resetAll);
    }
    _getPosition() {
        if (navigator.geolocation)
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
                alert('Couldn\'t get your location')
            })
    }

    _loadMap(position) {

        const { latitude } = position.coords;
        const { longitude } = position.coords;

        const coords = [latitude, longitude]
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this))

        this.#workouts.forEach(work => this.renderWorkoutMarker(work))

    }

    _showForm(mapE) {
        inputCadence.value = inputDuration.value = inputDistance.value = inputElevation.value = "";
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus()
        // console.log(this.#mapEvent)
    }

    _hideForm() {

        inputCadence.value = inputDuration.value = inputDistance.value = inputElevation.value = "";
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000)
    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden')
    }

    _checkValidation(...inputs) {

        const check = inputs.every(inp => Number.isFinite(inp)) || inputs.every(inp => inp > 0)
        return check
    }
    _newWorkout(e) {
        e.preventDefault()

        //Get data from the form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng
        let workout;

        if (type === 'running') {
            const cadence = +inputCadence.value;
            //validation check
            if (!this._checkValidation(distance, duration, cadence) || !this._checkValidation(distance, duration, cadence))
                return alert('Inputs have to be positive numbers!')

            workout = new Running([lat, lng], distance, duration, cadence)

        }
        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            //validation check
            if (!this._checkValidation(distance, duration, elevation) || !this._checkValidation(distance, duration, elevation))
                return alert('Inputs have to be positive numbers!')

            workout = new Cycling([lat, lng], distance, duration, elevation)

        }

        //Add new object to workouts array
        this.#workouts.push(workout)


        //Render workout on map as a marker
        this.renderWorkoutMarker(workout)

        //Render workout as a list
        this._renderWorkout(workout);

        //Hide from + clear input fields
        this._hideForm();

        //Set local storage to all workouts
        this._setLocalStorage();
    }

    renderWorkoutMarker(workout) {

        L.marker(workout.coords)
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    maxWidth: 250,
                    minWidth: 100,
                    autoClose: false,
                    closeOnClick: false,
                    className: `${workout.type}-popup`
                })
            )
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
            .openPopup()
    }

    _renderWorkout(workout) {
        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
                <h2 class="workout__title">${workout.type.toUpperCase()} on April 14</h2>
                    <div class="workout__details">
                    <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
                    <span class="workout__value">${workout.distance}</span>
                    <span class="workout__unit">km</span>
                </div >
                <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workout.duration}</span>
                    <span class="workout__unit">min</span>
                </div>
        `;

        if (workout.type === 'running') {
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
            </li>
            `
        }
        if (workout.type === 'cycling') {
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
            </li>
                `
        }
        form.insertAdjacentHTML('afterend', html);

    }

    _moveToPopup(e) {
        form.classList.add('hidden');
        const workoutEl = e.target.closest('.workout')
        if (!workoutEl) return
        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id)

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        });
        // console.log(e.target.closest('.workouts'))



    }


    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));

    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        if (!data) return

        this.#workouts = data;

        this.#workouts.forEach(work => this._renderWorkout(work))
    }

    _resetAll() {
        localStorage.removeItem('workouts')
        location.reload()

    }
}

const app = new App();




