let nodes = {};
let links = [];

function getTextWidth(text, fontSize = 12) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = `${fontSize}px Arial`;
    return context.measureText(text).width;
}

function getEdgeLength(text) {
    const textWidth = getTextWidth(text);
    const minPadding = 50; // Minimum padding on each side of the text
    return 400;
}

const svg = d3.select("#graph")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", [0, 0, window.innerWidth, window.innerHeight - 100]);

const g = svg.append("g");

// Add zoom behavior
const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on("zoom", (event) => {
        g.attr("transform", event.transform);
    });

svg.call(zoom);

function handleStartClick(e) {
    e.preventDefault();
    const input = document.getElementById('start-input');
    if (input.value) {
        generateTopic(input.value);
    }
}

function generateTopic(topic) {
    fetch("/generate_topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
    })
    .then(response => response.json())
    .then(data => {
        nodes[topic] = { id: topic, ...data, x: window.innerWidth / 2, y: (window.innerHeight - 100) / 2 };
        updateGraph();
    });
}

function generateSubtopics(event, d) {
    event.stopPropagation();

    if (d.subtopics) {
        updateGraph();
        return;
    }

    const topicName = d.id;

    fetch("/generate_subtopics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: topicName }),
    })
    .then(response => response.json())
    .then(subtopics => {
        d.subtopics = subtopics;
        const positions = [
            { dx: -1, dy: 1 },  // bottom-left
            { dx: 0, dy: 1.5 }, // bottom-center
            { dx: 1, dy: 1 }    // bottom-right
        ];
        subtopics.forEach((subtopic, index) => {
            const edgeLength = getEdgeLength(subtopic.relation);
            const x = d.x + positions[index].dx * edgeLength;
            const y = d.y + positions[index].dy * edgeLength;
            nodes[subtopic.name] = { id: subtopic.name, ...subtopic, x, y };
            links.push({ source: d, target: nodes[subtopic.name], relation: subtopic.relation });
        });
        updateGraph();
        zoomToFit();
    })
    .catch(error => console.error('Error generating subtopics:', error));
}

function showAbout(event, d) {
    event.stopPropagation();
    const popup = document.getElementById('about-popup');
    const title = document.getElementById('about-title');
    const description = document.getElementById('about-description');

    title.textContent = d.name;
    description.textContent = d.description;

    popup.style.display = 'block';
    popup.style.left = `${event.pageX}px`;
    popup.style.top = `${event.pageY}px`;
}

function updateGraph() {
    const nodeArray = Object.values(nodes);

    const link = g.selectAll(".link")
        .data(links)
        .join("line")
        .attr("class", "link")
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    const linkGroup = g.selectAll(".link-group")
        .data(links)
        .join("g")
        .attr("class", "link-group")
        .attr("transform", d => {
            const midX = (d.source.x + d.target.x) / 2;
            const midY = (d.source.y + d.target.y) / 2;
            const angle = Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x) * 180 / Math.PI;
            return `translate(${midX},${midY}) rotate(${angle})`;
        });

    linkGroup.selectAll(".link-text")
        .data(d => [d])
        .join("text")
        .attr("class", "link-text")
        .attr("text-anchor", "middle")
        .attr("dy", "-5")
        .text(d => d.relation)
        .attr("transform", d => {
            const angle = Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x) * 180 / Math.PI;
            return angle > 90 || angle < -90 ? "rotate(180)" : "";
        });

    const node = g.selectAll(".node")
        .data(nodeArray, d => d.id)
        .join("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x},${d.y})`);

    node.selectAll("circle")
        .data(d => [d])
        .join("circle")
        .attr("r", 30)
        .attr("fill", "lightblue");

    node.selectAll("text.node-name")
        .data(d => [d])
        .join("text")
        .attr("class", "node-name")
        .text(d => d.name)
        .attr("text-anchor", "middle")
        .attr("dy", "-0.5em");

    const aboutButton = node.selectAll(".about-button")
        .data(d => [d])
        .join("g")
        .attr("class", "about-button")
        .on("click", showAbout);

    aboutButton.append("circle")
        .attr("r", 10)
        .attr("cx", 20)
        .attr("cy", -20)
        .attr("fill", "white")
        .attr("stroke", "black");

    aboutButton.append("text")
        .attr("x", 20)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("dy", ".35em")
        .text("i");

    const expandButton = node.selectAll(".expand-button")
        .data(d => [d])
        .join("g")
        .attr("class", "expand-button")
        .on("click", generateSubtopics);

    expandButton.append("circle")
        .attr("r", 10)
        .attr("cx", 20)
        .attr("cy", 20)
        .attr("fill", "white")
        .attr("stroke", "black");

    expandButton.append("text")
        .attr("x", 20)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("dy", ".35em")
        .text("e");
}

function zoomToFit() {
    const bounds = g.node().getBBox();
    const fullWidth = window.innerWidth;
    const fullHeight = window.innerHeight - 100;
    const width = bounds.width;
    const height = bounds.height;
    const midX = bounds.x + width / 2;
    const midY = bounds.y + height / 2;
    
    if (width === 0 || height === 0) return; // nothing to fit
    
    const scale = 0.8 / Math.max(width / fullWidth, height / fullHeight);
    const translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];

    svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity
            .translate(translate[0], translate[1])
            .scale(scale));
}

document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('start-button');
    startButton.addEventListener('click', handleStartClick);

    // Close the about popup when clicking outside
    document.addEventListener('click', (event) => {
        const popup = document.getElementById('about-popup');
        if (event.target !== popup && !popup.contains(event.target)) {
            popup.style.display = 'none';
        }
    });
});


