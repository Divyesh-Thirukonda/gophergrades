(function() {
  let plotterUIPresented = chrome.storage.sync.get("settings").then((result) => result.settings["sb:showMapOfClasses"])

  let schedulePresented = false
  let plotterPresented = false

  let daySelected = "Monday"

  /**
   * updates the UI to match the current state of the page
   *
   * this is where all the decisions on when to refresh different components are
   * made:
   *    UI creation
   *    UI updates
   *
   * @param mutations{MutationRecord[]} mutations from MutationObserver
   */
  async function onChange(mutations) {
    if (!await plotterUIPresented) return;

    const schedule = document.querySelector("#schedule-main");

    //create elements if change is detected
    if (schedule !== schedulePresented) {
      schedulePresented = schedule
      if (schedule) {
        console.debug("schedule has just appeared; creating UI")
        createUI()
      }
    }

    //update iff schedule view is present
    if (!schedule) return;

    // update button only when necessary
    // (changes to DOM structure, e.g. button is removed)
    let doUpdateButton = mutations.find(m => m.type === "childList")
    //update map when DOM changes or attributes change
    // (for color hover """"feature"""")
    let doUpdateMap =
        doUpdateButton || mutations.find(m => m.type === "attributes");

    if (doUpdateButton) updateButton();
    if (doUpdateMap && plotterPresented) await updateMap();

    mutations.forEach(mutation => {
      switch (mutation.type) {
        case "childList":
          break;
        case "attributes":
          switch (mutation.attributeName) {
            case "status":
            case "username":
            default:
              break;
          }
          break;
      }
    })
  }

  function updateButton() {
    console.debug('updating button')
    const group = document.querySelector("div#rightside div.btn-group")
    const buttonPresent = document.querySelector("#gg-map-btn")
    //button bar not loaded yet or button already exists
    if (!group || buttonPresent) return;

    const buttonTemplate = (active) => `
    <div id="gg-map-btn" class="btn-group">
      <button id="gg-map-btn-btn" type="button" class="btn btn-default ${active ? "active" : ""}">
        <i class="fa fa-map"></i> Map
      </button>
    </div>
    `;

    const newButton = htmlToElement(buttonTemplate(plotterPresented))
    group.insertBefore(newButton, group.children[2])
    const group2 = document.querySelector("#button-bar > div.btn-group.btn-group-justified.hidden-print.visible-sm.visible-xs")
    group2.insertBefore(newButton.cloneNode(true), group2.children[2])
    document.querySelectorAll("#gg-map-btn-btn").forEach(node => {
      node.onclick = toggleMap
    });
  }

  function toggleMap() {
    plotterPresented = !plotterPresented
    const plotter = document.querySelector("#gg-plotter")
    // const map = document.querySelector("#gg-plotter-map")
    const button = document.querySelector("div#rightside div.btn-group")
        .children[2].children[0]
    if (plotterPresented) {
      plotter.style.display = "block";
      button.className = "btn btn-default active"
    } else {
      plotter.style.display = "none";
      button.className = "btn btn-default"
    }

    //todo: consider map an option like the schedule and agenda?
    // as in: replace the agenda/schedule when the map button is pressed
    // i don't really like it
    // you can hover over scheduler items and see where they are on the map
    // it's a feature
  }

  /**
   * creates the plotter UI
   *
   * reasons to call this function:
   *  - loading a schedule view for the first time
   *  - changing from agenda view to calendar view
   *    - (buttons obliterate entire main content view and replace it)
   */
  function createUI() {
    console.debug("creating UI")
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const right = document.querySelector("#rightside");

    //we must know from updateUI this is already false
    // if (!right) return

    //prepare map to be drawn on
    //todo: needs to detect sat and sun, but always add mon-fri by default
    // or maybe it doesn't need to add all 5 by default? wouldn't be useful
    const plotterTemplate = `
  <div id="gg-plotter">
      <div class="btn-group btn-group-justified hidden-print" style="margin-bottom: 1em;">
      ${days.map(day => {
      //NOW WE'rE CODING
      return `
          <div class="btn-group">
              <button id="gg-plotter-${day.toLowerCase()}-btn" type="button" class="btn btn-default">
                  ${ day.slice(0, 3) }
              </button>
          </div>
        `
    }).join("")}
      </div>
      <div style="display: flex; justify-content: space-between; align-items: bottom">
          <div id="gg-plotter-info">
              <div id="gg-plotter-distance">unknown</div>
              <div id="gg-plotter-report" style="color: #f00"></div>
          </div>
          <div style="display: default">
              <a id="gg-plotter-gmaps" class="btn btn-primary" target="_blank">
                  <i class="fa fa-map-pin"></i> View in Google Maps
              </a>
          </div>
      </div>
      <canvas id="gg-plotter-map" width="2304" height="1296" class="card" style="padding-top: 5px; padding-bottom: 5px;"></canvas>
  </div>
    `
    // <a id="gg-plotter-disclaimer" class="btn btn-primary" target="_blank" style="background-color: #dd4">
    //     <i class="fa fa-warning"></i> Disclaimer
    // </a>

    const plotter = htmlToElement(plotterTemplate)
    if (!plotterPresented) {
      plotter.style.display = "none"
    }
    //insert as second child (before the second object; the schedule)
    right.insertBefore(plotter, right.children[1])
    //todo: if rightside's class is col-md-12, fullscreen is active
    // place plotter to the right of the schedule?

    //add button functionality
    days.forEach(day => {
      const button = document.querySelector(`#gg-plotter-${day.toLowerCase()}-btn`)
      if (day === "Monday")
        button.className = "btn btn-default active";
      button.onclick = async function () {
        setDayButtonSelected(day)
        daySelected = day
        //this technically doesn't need to happen due to setDayButtonSelected
        // causing an attribute change to be signalled but just in case i ever
        // need it i'm going to leave it here with this egregiously long note
        // await updateMap()
      }
    })
    // const mapDiv = document.createElement("div")
    // mapDiv.id = "gg-plotter-slippy"
    // mapDiv.style.aspectRatio = "auto 2304/1296";
    // right.appendChild(mapDiv)

    // const map = L.map('gg-plotter-slippy').setView([44.9742, -93.2326], 13);

    // // we should not be using openstreetmap in production as it is a free service
    // // that is funded by donations
    // L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    //     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    // }).addTo(map);

    // L.marker([44.9742, -93.2326]).addTo(map)
    //     .bindPopup('meme<br>memes')
    //     .openPopup();
  }

  /**
   * takes the day and makes the corresponding button have the active styling
   * while inactivating all others
   *
   * @param activeDay string of day to switch to active styling
   */
  function setDayButtonSelected(activeDay) {
    //maybe make global at this point
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    //reset button styling
    days.forEach(day => {
      const button = document.querySelector(`#gg-plotter-${day.toLowerCase()}-btn`)
      if (day === activeDay) button.className = "btn btn-default active";
      else button.className = "btn btn-default";
    })

  }

  /**
   * plots on the map the representation of all the classes in a schedule from
   * information on the page (namely the section list in the left column)
   */
  async function updateMap() {
    console.debug("updating map")
    const canvas = document.querySelector("#gg-plotter-map");
    // canvas not loaded yet
    if (!canvas) return

    let schedule = getScheduleSections()
    const invalidSections = schedule.sections.filter(sec => sec.location === undefined)
    //use only sections that have a valid location
    schedule.sections = schedule.sections.filter(sec => sec.location)
    const section_nbrs = schedule.sections.map(s => s.id)
    const term = Number(SBUtil.getTermStrm())

    // classes not loaded yet
    // there shouldn't be a case where the scheduler is loaded without sections
    if (schedule.sections.length === 0) {
      console.warn("no classes have assigned classrooms yet")
      return
    }

    //fetch data from api
    const section_data = await SBAPI.fetchSectionInformation(section_nbrs, term)

    // sift through returned sections to get sections needed for the day selected
    const day_sections = []
    //yeah the order is different on purpose oh god this is so awful
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    section_data.forEach(section => {
      // i am disgusted by and ashamed of this
      if (section.days[days.indexOf(daySelected)])
        day_sections.push(section);
    })
    //sort by start time to plot schedule in order
    day_sections.sort((a, b) => a.startTime - b.startTime)
    //map back onto Section objects for the plotter to use
    const sections = day_sections.map(s => {
      return schedule.sections.find(ps => ps.id === s.id)
    })
    //maybe this object stuff is kinda gross, where should this parsing go
    schedule.sections = sections

    // monitor changes and update map
    const ctx = canvas.getContext("2d")
    const mapper = new SBUtil.Mapper(ctx)
    mapper.drawMap(schedule)

    const dist = SBUtil.calculateDistances(sections).toLocaleString(undefined, {maximumFractionDigits: 2})
    // determines whether or not the difference between subsequent sections is greater than 1 mile
    let interCampusTravel = false
    let prev = null
    for (let i = 0; i < sections.length; i++) {
      const curr = sections[i].location.x
      if (prev && (curr > 1500) !== (prev > 1500)) {
        interCampusTravel = true
        break
      }
      prev = curr
    }
    const distNode = document.querySelector("#gg-plotter-distance");
    if (!distNode) {
      console.warn('distance div does not exist???????')
    } else {
      distNode.textContent = `Distance: >${(interCampusTravel ? ">>>>" : "")+dist} miles`
    }

    const latLongs = SBUtil.pixelsToLatLong(sections);
    const link = "https://www.google.com/maps/dir/" +
        latLongs.map(c => c[0]+","+c[1]).reverse().join("/")
    const gMapsNode = document.querySelector("#gg-plotter-gmaps")
    // i really wish i knew what i was doing
    if (gMapsNode.href !== link) {
      gMapsNode.href = link
    }

    //report if there are any sections that do not have a location
    const reportNode = document.querySelector("#gg-plotter-report")
    if (invalidSections.length > 0) {
      console.warn("sections without locations: " + invalidSections.length)
      reportNode.textContent = `Warning: ${invalidSections.length} sections do not have a location`
    }
  }

  /**
   * scrapes locally available information about the current schedule's sections
   * (section number, location, color)
   *
   * @returns {SBUtil.Schedule} array of section objects with section, location,
   * and color attributes
   */
  function getScheduleSections() {
    let currColor = null
    const scheduleBody = document.querySelector(
        "#schedule-courses > div > div > table > tbody");
    const scheduleList = Array.from(scheduleBody.children)

    let sections = []
    let selected = null

    scheduleList.forEach(element => {
      const tds = element.children

      //class header
      if (tds.length === 3) {
        currColor = tds[0].style.backgroundColor
        return
      }

      //section (id/location)
      let sectionNbr = tds[1]
      //check this td for highlighting (could check any other than the first)
      const highlighted = sectionNbr.classList.contains("info")
      if (sectionNbr) {
        sectionNbr = sectionNbr.firstElementChild.textContent.trim();
        try {
          sectionNbr = Number(sectionNbr)
        } catch {
          console.warn("could not read section number " + sectionNbr)
          sectionNbr = null
        }
      } else {
        sectionNbr = null;
        console.warn("could not obtain section no. (very weird)")
      }
      //this should only evaluate to true once, but shouldn't cause problems
      // if this statement doesn't hold
      if (highlighted) selected = sectionNbr;

      //location (excl. room no. (for now))
      //a section can have multiple locations for different meeting times
      let location = tds[4].firstElementChild.textContent.trim();
      if (location === "No room listed.") {
        location = undefined
      } else if (location === "Remote Class" || location === "Online Only") {
        console.debug("Remote Class detected don't acknowledge")
        //todo: acknowledge
        // when it says remote class that means mandatory attendance which would
        // be important to tell the user about whatever none of this matters
        location = undefined
      } else {
        const locationObject = SBUtil.locations.find(loc => loc.location === location);
        if (!locationObject) {
          console.warn("could not find location " + location)
          location = undefined
        } else {
          location = locationObject
        }
      }

      const newSection = new SBUtil.Section(sectionNbr, location, currColor);
      sections.push(newSection)
    });

    return new SBUtil.Schedule(sections, selected)
  }

  //load map image as an img tag
  // (this seems to be the most valid way for some reason)
  function loadMapImage() {
    const imageTemplate = (imageURL, id) => `
    <img src="${imageURL}" id="${id}" style="display: none;">`

    const mapURL = chrome.runtime.getURL('static/walking.png')
    const mapTag = htmlToElement(imageTemplate(mapURL, "gg-map-image"))
    document.body.appendChild(mapTag)

    const logoURL = chrome.runtime.getURL('static/icons/icon-128.png')
    const logoTag = htmlToElement(imageTemplate(logoURL, "gg-logo-image"))
    document.body.appendChild(logoTag)
  }

  new MutationObserver(onChange).observe(document, {
    childList: true,
    attributes: true,
    subtree: true
  });

  //load only once
  loadMapImage()
})();