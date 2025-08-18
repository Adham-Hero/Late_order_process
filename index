document.getElementById("addRiderBtn").addEventListener("click", () => {
  const riderDiv = document.createElement("div");
  riderDiv.classList.add("rider", "border", "rounded", "p-3", "mb-2");
  riderDiv.innerHTML = `
    <label>Queued Time: <input type="time" class="form-control queued"></label>
    <label>Accepted Time: <input type="time" class="form-control accepted"></label>
    <label>Committed Pickup Time: <input type="time" class="form-control committed"></label>
    <label>Near Pickup Time: <input type="time" class="form-control nearpickup"></label>
    <label>Picked Up Time: <input type="time" class="form-control pickedup"></label>
    <label>Est. Dropoff Departure: <input type="time" class="form-control dropoff"></label>
  `;
  document.getElementById("ridersContainer").appendChild(riderDiv);
});

document.getElementById("calculateBtn").addEventListener("click", () => {
  const riders = document.querySelectorAll(".rider");
  let totalDispatchingTime = 0;
  let delays = [];
  let cancellationReason = "";

  riders.forEach(rider => {
    const queued = rider.querySelector(".queued").value;
    const accepted = rider.querySelector(".accepted").value;
    const committed = rider.querySelector(".committed").value;
    const nearpickup = rider.querySelector(".nearpickup").value;
    const pickedup = rider.querySelector(".pickedup").value;
    const dropoff = rider.querySelector(".dropoff").value;

    if (queued && accepted) {
      totalDispatchingTime += diffMinutes(queued, accepted);
    }

    if (committed && pickedup) {
      delays.push(diffMinutes(committed, pickedup));
    } else if (nearpickup && pickedup) {
      delays.push(diffMinutes(nearpickup, pickedup));
    }

    if (dropoff && pickedup) {
      let dropoffDelay = diffMinutes(pickedup, dropoff);
      if (dropoffDelay > 0) delays.push(dropoffDelay);
    }
  });

  // Cancellation Reason
  let riderReachable = document.getElementById("riderReachable").value;
  let maxDelay = Math.max(...delays, totalDispatchingTime);

  if (maxDelay === totalDispatchingTime) {
    cancellationReason = "Lack of Delivery Men";
  } else if (riderReachable === "yes") {
    cancellationReason = "Late Delivery";
  } else if (riderReachable === "no") {
    cancellationReason = "Rider Unreachable";
  } else {
    cancellationReason = "Preparation Delay";
  }

  document.getElementById("result").innerHTML = `
    <h5>Results:</h5>
    <p>Total Dispatching Time: ${totalDispatchingTime} mins</p>
    <p>Delays: ${delays.join(", ")} mins</p>
    <p><strong>Cancellation Reason:</strong> ${cancellationReason}</p>
  `;
});

function diffMinutes(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}
