const nextBtn = document.querySelector("button#action");
const TOTAL_TEAMS = 4;

let currentGroups = 8;
let mainBracketData = createBracketData(TOTAL_TEAMS, currentGroups);

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text) {
    element.textContent = text;
  }
  return element;
}

function generateGroup(groupData) {
  const bracket = document.querySelector(".bracket");
  const group = createElement("div", "group");
  groupData.forEach((item) => {
    const div = createElement("div", item.class, item.text);
    group.appendChild(div);
  });
  return group;
}

function generateColumn(columnData) {
  const column = createElement("div", "column");
  columnData.forEach((groupData) => {
    const group = generateGroup(groupData);
    column.appendChild(group);
  });
  return column;
}

function generateBracket(bracketData, skipAnim) {
  const bracket = document.querySelector(".bracket");
  Array.from(bracket.children).forEach((child) => {
    if (child.tagName !== "BUTTON") {
      child.remove();
    }
  });

  bracketData.forEach((columnData) => {
    const column = generateColumn(columnData);
    if (column.innerHTML) {
      bracket.appendChild(column);
    }
  });

  document.querySelectorAll(".group").forEach((group, i) => {
    i = Array.from(group.parentNode.children).findIndex((el) => el === group);
    group.style.setProperty("--delay", `${i * 125}ms`);

    if (skipAnim) {
      Array.from(group.children).forEach((team) => {
        team.classList.add("skip-anim");
      });
    }
  });
}

function getRandomElementFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function isValidGrouping(array) {
  for (let i = 0; i < array.length; i += 2) {
    if (array[i] === array[i + 1]) {
      return false;
    }
  }
  return true;
}

function createBracketData(teams, groups, shouldShuffle) {
  const totalTeamsPerColor = Math.ceil((groups * 2) / teams);
  const allTeams = [];
  for (let i = 0; i < teams; i++) {
    for (let j = 0; j < totalTeamsPerColor; j++) {
      allTeams.push(`team${i + 1}`);
    }
  }

  if (shouldShuffle) {
    do {
      shuffle(allTeams);
    } while (!isValidGrouping(allTeams));
  }

  const bracketData = [[], []];
  for (let i = 0; i < groups; i++) {
    const [i1, i2] = [i * 2, i * 2 + 1];
    const groupData = [];
    const isFirstHalf = groups / 2 > i;
    groupData.push({
      class: allTeams[i1],
      text: String.fromCharCode(65 + i1),
    });
    groupData.push({
      class: allTeams[i2],
      text: String.fromCharCode(65 + i2),
    });

    bracketData[isFirstHalf ? 0 : 1].push(groupData);
  }
  return bracketData;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function showWinner() {
  const el = getRandomElementFromArray(
    document.querySelectorAll(".bracket .group div")
  );
  const winEl = el.cloneNode(true);
  winEl.style.zIndex = 100;
  winEl.classList.add("winner");
  el.parentElement.appendChild(winEl);
  el.style.opacity = 0;
  const rect = el.getBoundingClientRect();

  winEl.style.left = `${rect.left + rect.width / 2}px`;
  winEl.style.top = `${rect.top + rect.height / 2}px`;
  requestAnimationFrame(() => {
    winEl.style.left = "50%";
    winEl.style.top = "50%";
  });
  const transitionTime =
    parseFloat(window.getComputedStyle(winEl).transitionDuration) * 1000;

  await sleep(transitionTime * 1.1);

  return el.textContent;
}

function moveTeamsToCenter(animateIn) {
  const teams = document.querySelectorAll(".group > div");
  teams.forEach((team) => {
    const rect = team.getBoundingClientRect();
    team.classList.add("skip-anim");

    const offsetFromCenterX =
      rect.left - window.innerWidth / 2 + rect.width / 2;
    const offsetFromCenterY =
      rect.top - window.innerHeight / 2 + rect.height / 2;

    requestAnimationFrame(() => {
      team.style.transform = `translate(${-offsetFromCenterX}px, ${-offsetFromCenterY}px) rotate(${
        Math.random() * 360 - 180
      }deg) scale(0.5)`;
    });

    if (!animateIn) {
      team.classList.add("shuffled");
    }
  });
}

async function rearrangeBracket() {
  moveTeamsToCenter(true);
  await sleep(500);

  mainBracketData = shuffleBracket(mainBracketData);
  generateBracket(mainBracketData, true);

  moveTeamsToCenter();
  await sleep(500);
}

function shuffleBracket(bracket) {
  const allTeams = bracket.flatMap((column) =>
    column.flatMap((group) => group)
  );

  const teamsByClass = allTeams.reduce((acc, team) => {
    if (!acc[team.class]) acc[team.class] = [];
    acc[team.class].push(team);
    return acc;
  }, {});
  Object.values(teamsByClass).map(shuffle);

  const newBracket = bracket.map((column) => column.map(() => []));

  let classIndex = 0;
  const classes = Object.keys(teamsByClass);
  let classIndices = [...Array(classes.length).keys()];

  for (let colIndex = 0; colIndex < newBracket.length; colIndex++) {
    for (
      let groupIndex = 0;
      groupIndex < newBracket[colIndex].length;
      groupIndex++
    ) {
      for (let i = 0; i < 2; i++) {
        // classIndex = (classIndex + 1) % classes.length
        classIndex = getRandomElementFromArray(classIndices);
        classIndices = classIndices.filter((i) => i !== classIndex);
        if (classIndices.length === 0)
          classIndices = [...Array(classes.length).keys()];

        const currentClass = classes[classIndex];
        const team = teamsByClass[currentClass].pop();
        newBracket[colIndex][groupIndex].push(team);
      }
    }
  }

  return newBracket;
}

function eliminateHalf() {
  let teamCounts = mainBracketData
    .flatMap((column) =>
      column.flatMap((group) => group.map((team) => team.class))
    )
    .reduce((acc, teamClass) => {
      acc[teamClass] = (acc[teamClass] || 0) + 1;
      return acc;
    }, {});

  let teamsToEliminate = Object.keys(teamCounts).reduce((acc, teamClass) => {
    acc[teamClass] = Math.floor(teamCounts[teamClass] / 2);
    return acc;
  }, {});

  mainBracketData = mainBracketData.map((column) => {
    return column
      .map((group) => {
        return group.filter((team) => {
          if (teamsToEliminate[team.class] > 0) {
            teamsToEliminate[team.class]--;
            return false;
          }
          return true;
        });
      })
      .filter((group) => group.length > 0);
  });

  if (currentGroups > 1) {
    while (mainBracketData[0].length !== mainBracketData[1].length) {
      if (mainBracketData[0].length > mainBracketData[1].length) {
        mainBracketData[1].push(mainBracketData[0].pop());
      } else {
        mainBracketData[0].push(mainBracketData[1].pop());
      }
    }
  } else {
    mainBracketData[0][0].splice(Math.random() > 0.5 ? 0 : 1, 1);
    mainBracketData[1][0].splice(Math.random() > 0.5 ? 0 : 1, 1);
  }
}

generateBracket(mainBracketData);

nextBtn.addEventListener("click", async () => {
  if (currentGroups > 1) {
    nextBtn.disabled = true;

    await rearrangeBracket();
    alert("Shuffled!");

    currentGroups /= 2;
    nextBtn.disabled = false;
    eliminateHalf();
    generateBracket(mainBracketData);
  } else {
    nextBtn.disabled = true;
    const winner = await showWinner();
    alert(`Winner: ${winner}`);
    nextBtn.disabled = false;
    nextBtn.id = "reset";
    setTimeout(() => {
      nextBtn.id = "action";
    });
    currentGroups = 8;
    mainBracketData = createBracketData(TOTAL_TEAMS, currentGroups);
    generateBracket(mainBracketData);
  }
});
