import {
	c,
	python,
	java,
	cpp,
	javascript,
	html,
	css,
	reactjs,
	tailwind,
	nodejs,
	git,
	edunet,
	weatherpedia,
	termpw,
	payloadmaster,
	threejs,
	mhft,
	sketcher,
	mathwork,
	CompileVortex,
	eduskill,
  test,
  nasajpl,
  fyiai,
  
} from "../assets";

export const navLinks = [
	{
		id: "about",
		title: "About",
	},
	{
		id: "work",
		title: "Work",
	},
	{
		id: "contact",
		title: "Contact",
	},
];

export const services = [
	{ title: "C", icon: c },
	{ title: "C++", icon: cpp },
	{ title: "Python", icon: python },
	{ title: "Java", icon: java },
];

export const technologies = [
	{ name: "HTML 5", icon: html },
	{ name: "CSS 3", icon: css },
	{ name: "JavaScript", icon: javascript },
	{ name: "Rect JS", icon: reactjs },
	{ name: "Tailwind CSS", icon: tailwind },
	{ name: "Node JS", icon: nodejs },
	{ name: "Three JS", icon: threejs },
	{ name: "git", icon: git },
];

export const experiences = [
  {
		title: "• Student intern",
		company_name: "JPL - Telescope Moontrek CSULA",
		icon: test,
		iconBg: "#95a5a6 ",
		date: "Aug 2023 - May 2024",
		points: [
			"Collaborated with a team using Git for efficient task management and daily progress tracking, ensuring smooth and coordinated project development.",
			"Developed proficiency in Vue.js, enabling seamless local environment setup for website development and enhancing coding efficiency.",
			"Worked extensively on the front-end development of the website with a teammate, ensuring a user-friendly and engaging interface. This involved designing and implementing interactive components, optimizing performance, and continuously improving the user experience based on feedback.",
		],
	},

	{
		title: "•	Software Quality Assurance Engineer Intern",
		company_name: "FYI.AI",
		icon: fyiai,
		iconBg: "#95a5a6",
		date: "Oct 2024 - Present",
		points: [
			"Participated in Agile sprint planning and backlog refinement meetings to synchronize testing strategies with development goals. ",
			"Executed comprehensive acceptance, regression, and smoke testing to ensure software quality and functionality across updates",
      "Utilized tools like JIRA, Confluence, and Xcode for effective bug tracking, documentation, and crash log analysis. Developed and optimized test cases, enhancing product reliability and enabling early issue detection.",
		],
	},
	
	// {
	// 	title: "",
	// 	company_name: "",
	// 	icon: ,
	// 	iconBg: "#161329",
	// 	date: "June 2023 - July 2023",
	// 	points: [
	// 		"",
	// 		"",
	// 		"",
	// 	],
	// },
];

export const projects = [
	{
		name: "Your-Moon",
		description:
			"Developed a comprehensive web application with a Vue.js frontend integrated with a Web Assembly (WASM) library for Moon location detection. The backend was built using Node.js and deployed in a Docker container on Amazon Web Services (AWS) Elastic Compute Cloud (EC2). A MySQL database hosted in AWS Relational Database Service (RDS) was utilized to store image metadata including moon location geo-location timestamp instrument and make.",
		tags: [
			{ name: "Javascript", color: "blue-text-gradient" },
      { name: "Vue.js", color: "green-text-gradient" },
      { name: "Node.js", color: "pink-text-gradient" },
      { name: "MySQL", color: "yellow-text-gradient" },
			{ name: "HTML", color: "green-text-gradient" },
			{ name: "bootstrap 5.3.0", color: "pink-text-gradient" },
			{ name: "Moon API by JPL", color: "yellow-text-gradient" },
      { name: "AWS", color: "blue-text-gradient" },
      { name: "Docker", color: "green-text-gradient" },
      { name: "Web Assembly", color: "pink-text-gradient" },
		],
		image: nasajpl,
		source_code_link: "your-moon.space",
	},
	{
		name: "Moontrek JPL (Full Stack Web Application)",
		description:
			"Utilized Vue.js for the frontend and Node.js and Python for the backend to develop a sophisticated image registration system and infinite zoom feature. The image registration system allows for accurate overlay of images on user-submitted images by employing context-aware techniques to identify points of interest and generate base images from a 3D model of the Moon, integrating time and location data..",
		tags: [
			{ name: "HTML", color: "blue-text-gradient" },
			{ name: "css", color: "green-text-gradient" },
			{ name: "Javascript", color: "pink-text-gradient" },
      { name: "Vue.js", color: "yellow-text-gradient" },
      { name: "Node.js", color: "blue-text-gradient" },
      { name: "Python", color: "green-text-gradient" },
      { name: "MongoDB", color: "pink-text-gradient" },
      { name: "AWS", color: "yellow-text-gradient" },
      { name: "Docker", color: "blue-text-gradient" },
      { name: "Web Assembly", color: "green-text-gradient" },

		],
		image: nasajpl,
		source_code_link: "https://github.com/zaldivarjoan/Moon-Trek-CSULA",
	},
	{
		name: "DigiKey API (Web Application)",
		description:
			"Developed a Command Line Interface (CLI) and an Express.js server application using JavaScript, Node.js, and MongoDB. Demonstrated skills in API integration, server-side programming, and database management. Created an api.js module to encapsulate DigiKey API interactions, including function exports for data searches and API token handling. Managed application dependencies and environment configurations using package. Json and .env files.",
		tags: [{ name: "shell", color: "blue-text-gradient" },
      { name: "JavaScript", color: "green-text-gradient" },
      { name: "Node.js", color: "pink-text-gradient" },
      { name: "MongoDB", color: "yellow-text-gradient" },
      { name: "Express.js", color: "blue-text-gradient" },
      { name: "API", color: "green-text-gradient" },
      { name: "CLI", color: "pink-text-gradient" },
      { name: "DigiKey API", color: "yellow-text-gradient" },


    ],

		image: payloadmaster,
		source_code_link: "https://github.com/zaldivarjoan/DigiKeyAPi-Project",
	},

	{
		name: "Article Website",
		description:
			"Transformed a static web page into a multi-tiered web application by implementing the Model-View-Controller (MVC) architecture. User input was effectively captured and stored in an SQL database using JDBC, supported by custom scripts to ensure efficient data handling and retrieval.",
		tags: [
			{ name: "Javascript", color: "blue-text-gradient" },
			{ name: "CSS", color: "green-text-gradient" },
			{ name: "HTML", color: "pink-text-gradient" },
      { name: "Java", color: "yellow-text-gradient" },
      { name: "SQL", color: "blue-text-gradient" },
      { name: "JDBC", color: "green-text-gradient" },
      { name: "MVC", color: "pink-text-gradient" },
		],
		image: CompileVortex,
		source_code_link: "https://github.com/zaldivarjoan/Articles_Website",
	},
	
];
