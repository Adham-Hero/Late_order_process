function diffMinutes(startTime, endTime) {
    const today = new Date();
    if (!startTime || !endTime) return 0;
    const [startHourMin, startPeriod] = startTime.split(' ');
    const [endHourMin, endPeriod] = endTime.split(' ');
    let [startHour, startMin] = startHourMin.split(':').map(Number);
    let [endHour, endMin] = endHourMin.split(':').map(Number);
    if (startPeriod.toUpperCase() === 'PM' && startHour !== 12) startHour += 12;
    if (startPeriod.toUpperCase() === 'AM' && startHour === 12) startHour = 0;
    if (endPeriod.toUpperCase() === 'PM' && endHour !== 12) endHour += 12;
    if (endPeriod.toUpperCase() === 'AM' && endHour === 12) endHour = 0;
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, startMin);
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endHour, endMin);
    return Math.floor((endDate - startDate) / 60000);
}

document.getElementById("addRiderBtn").addEventListener("click", () => {
    const riderDiv = document.createElement("div");
    riderDiv.classList.add("rider", "border", "rounded", "p-3", "mb-3", "bg-white", "shadow-sm");

    riderDiv.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0">Rider ${document.querySelectorAll('.rider').length + 1}</h6>
            <button type="button" class="btn btn-sm btn-danger remove-rider">Delete</button>
        </div>
        <div class="row g-2">
            <div class="col-md-4">
                <label>Queued Time: 
                    <input type="text" placeholder="0:00 AM/PM" class="form-control queued">
                </label>
            </div>
            <div class="col-md-4">
                <label>Accepted Time: 
                    <input type="text" placeholder="0:00 AM/PM" class="form-control accepted">
                </label>
            </div>
            <div class="col-md-4">
                <label>Committed Pickup Time: 
                    <input type="text" placeholder="0:00 AM/PM" class="form-control committed">
                </label>
            </div>
            <div class="col-md-4">
                <label>Near Pickup Time: 
                    <input type="text" placeholder="0:00 AM/PM" class="form-control nearpickup">
                </label>
            </div>
            <div class="col-md-4">
                <label>Picked Up Time: 
                    <input type="text" placeholder="0:00 AM/PM" class="form-control pickedup">
                </label>
            </div>
            <div class="col-md-4">
                <label>Est. Dropoff Departure: 
                    <input type="text" placeholder="0:00 AM/PM" class="form-control dropoff">
                </label>
            </div>
        </div>
    `;

    const vertical = document.getElementById("vertical").value;
    const ridersContainer = document.getElementById("ridersContainer");
    ridersContainer.appendChild(riderDiv);

    // إضافة Scheduled Time للسائق الأول NFV فقط
    const riders = document.querySelectorAll(".rider");
    if (vertical === "NFV" && riders.length === 1 && !riderDiv.querySelector(".scheduled")) {
        const scheduledInput = document.createElement("div");
        scheduledInput.classList.add("mt-2");
        scheduledInput.innerHTML = `
            <label>Scheduled Time: 
                <input class="form-control scheduled" type="text" placeholder="0:00 AM/PM">
            </label>
        `;
        riderDiv.insertBefore(scheduledInput, riderDiv.firstChild);
    }

    // حدث حذف السائق عند الضغط على زر Delete
    riderDiv.querySelector(".remove-rider").addEventListener("click", () => {
        riderDiv.remove();
    });
});

document.getElementById("calculateBtn").addEventListener("click", () => {
    const vertical = document.getElementById("vertical").value;
    const riders = document.querySelectorAll(".rider");
    const currentTimeInput = document.getElementById("currentTime").value;
    let groupedDelays = { "Dispatching Delay": 0, "Rider Delay": 0, "Preparation Delay": 0 };
    let timelineHTML = "<h5>Timeline:</h5><ul>";
    let firstRiderIssue = false;

    riders.forEach((rider, index) => {
        const queued = rider.querySelector(".queued")?.value;
        const accepted = rider.querySelector(".accepted")?.value;
        const committed = rider.querySelector(".committed")?.value;
        const nearpickup = rider.querySelector(".nearpickup")?.value;
        const pickedup = rider.querySelector(".pickedup")?.value;
        const dropoff = rider.querySelector(".dropoff")?.value;
        let scheduled = vertical === "NFV" && index === 0 ? rider.querySelector(".scheduled")?.value : null;

        timelineHTML += `<li><strong>Rider ${index + 1}:</strong><ul>`;
        if (scheduled) timelineHTML += `<li>Scheduled: ${scheduled}</li>`;
        if (queued) timelineHTML += `<li>Queued: ${queued}</li>`;
        if (accepted) timelineHTML += `<li>Accepted: ${accepted}</li>`;
        if (committed) timelineHTML += `<li>Committed Pickup: ${committed}</li>`;
        if (nearpickup) timelineHTML += `<li>Near Pickup: ${nearpickup}</li>`;
        if (pickedup) timelineHTML += `<li>Picked Up: ${pickedup}</li>`;
        if (dropoff) timelineHTML += `<li>Est. Dropoff Departure: ${dropoff}</li>`;

        // Dispatching Delay
        if (queued && accepted) {
            let dispatchTime = diffMinutes(queued, accepted);
            groupedDelays["Dispatching Delay"] += dispatchTime;
            if (vertical === "NFV" && scheduled) {
                let prepTime = diffMinutes(scheduled, queued);
                if (prepTime > 0) groupedDelays["Preparation Delay"] += prepTime;
            }
        }

        // Preparation Delay
        let preparationDelay = 0;
        if (nearpickup && committed) {
            if (diffMinutes(nearpickup, committed) < 0) {
                if (pickedup && diffMinutes(committed, pickedup) > 0) {
                    preparationDelay = diffMinutes(committed, pickedup);
                    groupedDelays["Preparation Delay"] += preparationDelay;
                }
            } else {
                if (pickedup && diffMinutes(nearpickup, pickedup) > 0) {
                    preparationDelay = diffMinutes(nearpickup, pickedup);
                    groupedDelays["Preparation Delay"] += preparationDelay;
                }
            }
        } else if (committed && pickedup && diffMinutes(committed, pickedup) > 0) {
            preparationDelay = diffMinutes(committed, pickedup);
            groupedDelays["Preparation Delay"] += preparationDelay;
        }
        if (preparationDelay > 0) timelineHTML += `<li style="color:orange;">Preparation Delay: ${preparationDelay} mins</li>`;

        // Rider Delay
        let riderDelay = 0;
        if (pickedup && currentTimeInput) {
            riderDelay = diffMinutes(pickedup, currentTimeInput);
            if (riderDelay > 0) {
                groupedDelays["Rider Delay"] += riderDelay;
                timelineHTML += `<li style="color:red;">Rider Delay: ${riderDelay} mins</li>`;
            }
        }

        // Driving Time
        if (dropoff && pickedup) {
            let driving = diffMinutes(pickedup, dropoff);
            if (driving >= 0) timelineHTML += `<li>Driving Time: ${driving} mins</li>`;
        }

        // Extra Rider Delay بين السائق الأول والثاني
        if (riders.length > 1 && index === 0) {
            const nextRider = riders[1];
            const nextAssignedTime = nextRider.querySelector(".queued")?.value || nextRider.querySelector(".accepted")?.value;
            const lastTimeFirstRider = pickedup || nearpickup || committed || accepted || queued;
            if (lastTimeFirstRider && nextAssignedTime) {
                let extraDelay = diffMinutes(lastTimeFirstRider, nextAssignedTime);
                if (extraDelay > 0) {
                    groupedDelays["Rider Delay"] += extraDelay;
                    timelineHTML += `<li style="color:red;">Extra Rider Delay before second rider assigned: ${extraDelay} mins</li>`;
                }