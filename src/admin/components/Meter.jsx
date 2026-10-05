import { createSignal, createMemo, onMount, onCleanup, For, splitProps, mergeProps } from 'solid-js';

export default function Meter(props) {
	const merged = mergeProps({ speed: 0 }, props);
	const [local] = splitProps(merged, ['speed', 'class']);

	const [currentAngle, setCurrentAngle] = createSignal(-90);
	const [currentPercent, setCurrentPercent] = createSignal(0);
	const [previousAngles, setPreviousAngles] = createSignal([-90, -90, -90]);
	const [centerRadius, setCenterRadius] = createSignal(10);
	const [blurAmount, setBlurAmount] = createSignal(0);

	let shakeInterval;

	const fullArcLength = Math.PI * 120;

	const arcLength = createMemo(() => {
		return ((currentAngle() + 90) / 180) * fullArcLength;
	});

	const color = createMemo(() => {
		if (local.speed <= 30) return 'rgb(239, 68, 68)';
		if (local.speed <= 75) return 'rgb(251, 146, 60)';
		return 'rgb(34, 197, 94)';
	});

	const redZoneLength = createMemo(() => (30 / 100) * fullArcLength);
	const yellowZoneLength = createMemo(() => (45 / 100) * fullArcLength);
	const greenZoneLength = createMemo(() => (25 / 100) * fullArcLength);
	const yellowZoneOffset = createMemo(() => -redZoneLength());
	const greenZoneOffset = createMemo(() => -(redZoneLength() + yellowZoneLength()));

	const speedText = createMemo(() => {
		if (local.speed <= 30) return 'Poor Speed';
		if (local.speed <= 75) return 'Medium Speed';
		return 'High Speed';
	});

	const marks = createMemo(() => {
		const result = [];
		const centerX = 150;
		const centerY = 150;
		const radius = 120;
		const tickLength = 8;
		const tickInnerRadius = radius - tickLength;

		for (let i = 0; i <= 100; i += 10) {
			const angle = -90 + (i / 100) * 180;
			const radian = (angle * Math.PI) / 180;

			const x1 = centerX + Math.cos(radian) * radius;
			const y1 = centerY + Math.sin(radian) * radius;
			const x2 = centerX + Math.cos(radian) * tickInnerRadius;
			const y2 = centerY + Math.sin(radian) * tickInnerRadius;

			result.push({
				x1,
				y1,
				x2,
				y2,
				major: i % 25 === 0,
			});
		}
		return result;
	});

	const startShaking = () => {
		if (shakeInterval) clearInterval(shakeInterval);

		let lastUpdate = Date.now();
		let lastPercent = local.speed || 0;

		const animate = () => {
			const now = Date.now();
			const elapsed = now - lastUpdate;

			let minPercent, maxPercent;
			if (local.speed === 0) {
				minPercent = 0;
				maxPercent = 5;
			} else if (local.speed === 100) {
				minPercent = 95;
				maxPercent = 100;
			} else {
				minPercent = Math.max(0, local.speed - 5);
				maxPercent = Math.min(100, local.speed + 5);
			}

			let newPercent = currentPercent();

			if (elapsed > 30 + Math.random() * 50) {
				const randomPercent = minPercent + Math.random() * (maxPercent - minPercent);
				newPercent = Math.round(randomPercent * 10) / 10;
				newPercent = Math.max(minPercent, Math.min(maxPercent, newPercent));
				lastPercent = newPercent;
				lastUpdate = now;
			} else {
				const microShake = (Math.random() - 0.5) * 0.3;
				newPercent = lastPercent + microShake;
				newPercent = Math.max(minPercent, Math.min(maxPercent, newPercent));
			}

			setCurrentPercent(newPercent);

			const newAngle = -90 + (newPercent / 100) * 180;

			setPreviousAngles((prev) => [currentAngle(), ...prev.slice(0, 2)]);

			const angleDiff = newAngle - currentAngle();
			if (Math.abs(angleDiff) > 0.2) {
				const jumpAmount = angleDiff * 0.9;
				const overshoot = (Math.random() - 0.5) * 1.2;
				setCurrentAngle(currentAngle() + jumpAmount + overshoot);
			} else {
				const vibration = (Math.random() - 0.5) * 0.5;
				setCurrentAngle(newAngle + vibration);
			}

			if (local.speed >= 50) {
				setCenterRadius(10 + Math.sin(Date.now() / 150) * 1.5);
				setBlurAmount(1.5 + Math.sin(Date.now() / 120) * 1);
			} else {
				setCenterRadius(10 + Math.sin(Date.now() / 300) * 0.8);
				setBlurAmount(0.5 + Math.sin(Date.now() / 250) * 0.4);
			}
		};

		shakeInterval = setInterval(animate, 10);
	};

	onMount(() => {
		setCurrentPercent(local.speed || 0);
		setCurrentAngle(-90 + ((local.speed || 0) / 100) * 180);
		startShaking();
	});

	onCleanup(() => {
		if (shakeInterval) clearInterval(shakeInterval);
	});

	return (
		<svg
			width="100%"
			viewBox="0 0 300 160"
			preserveAspectRatio="xMidYMid meet"
			class={local.class}
		>
			<defs>
				<filter id="glow">
					<feGaussianBlur stdDeviation="3" result="coloredBlur" />
					<feMerge>
						<feMergeNode in="coloredBlur" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
				<filter id="motionBlur">
					<feGaussianBlur in="SourceGraphic" stdDeviation={`${blurAmount()},0`} />
				</filter>
			</defs>

			<path
				d="M 30,150 A 120,120 0 0,1 270,150"
				fill="none"
				stroke="rgba(0, 0, 0, 0.1)"
				stroke-width="14"
				stroke-linecap="round"
			/>

			<path
				d="M 30,150 A 120,120 0 0,1 270,150"
				fill="none"
				stroke="rgb(239, 68, 68)"
				stroke-width="14"
				stroke-linecap="round"
				stroke-dasharray={`${redZoneLength()} 1000`}
				opacity="0.3"
			/>

			<path
				d="M 30,150 A 120,120 0 0,1 270,150"
				fill="none"
				stroke="rgb(251, 146, 60)"
				stroke-width="14"
				stroke-linecap="round"
				stroke-dasharray={`${yellowZoneLength()} 1000`}
				stroke-dashoffset={yellowZoneOffset()}
				opacity="0.3"
			/>

			<path
				d="M 30,150 A 120,120 0 0,1 270,150"
				fill="none"
				stroke="rgb(34, 197, 94)"
				stroke-width="14"
				stroke-linecap="round"
				stroke-dasharray={`${greenZoneLength()} 1000`}
				stroke-dashoffset={greenZoneOffset()}
				opacity="0.3"
			/>

			<path
				d="M 30,150 A 120,120 0 0,1 270,150"
				fill="none"
				stroke={color()}
				stroke-width="14"
				stroke-linecap="round"
				stroke-dasharray={`${arcLength()} 1000`}
				opacity="0.9"
			/>

			<g>
				<For each={marks()}>
					{(mark) => (
						<line
							x1={mark.x1}
							y1={mark.y1}
							x2={mark.x2}
							y2={mark.y2}
							stroke="rgb(71, 85, 105)"
							stroke-width={mark.major ? 2.5 : 1.5}
							opacity={mark.major ? 0.7 : 0.4}
							stroke-linecap="round"
						/>
					)}
				</For>
			</g>

			<For each={[1, 2, 3]}>
				{(i) => (
					<line
						x1="150"
						y1="150"
						x2="150"
						y2="35"
						stroke={color()}
						stroke-width={6 - i}
						stroke-linecap="round"
						opacity={0.3 - i * 0.08}
						filter="url(#motionBlur)"
						style={`transform-origin: 150px 150px; transform: rotate(${previousAngles()[i - 1]}deg);`}
					/>
				)}
			</For>

			<g style={`transform-origin: 150px 150px; transform: rotate(${currentAngle()}deg);`}>
				<path
					d="M 150 150 L 147 40 L 150 32 L 153 40 Z"
					fill="rgb(71, 85, 105)"
					filter="url(#glow)"
					opacity="0.95"
				/>
				<path
					d="M 150 150 L 147 40 L 150 32 L 153 40 Z"
					stroke="rgb(71, 85, 105)"
					stroke-width="0.8"
					fill="none"
					opacity="0.7"
				/>
			</g>

			<circle
				cx="150"
				cy="150"
				r={centerRadius()}
				fill="rgb(71, 85, 105)"
				filter="url(#glow)"
			/>

			<circle cx="150" cy="150" r="4" fill="white" opacity="0.9" />
			<circle cx="150" cy="150" r="2" fill="rgb(71, 85, 105)" opacity="0.9" />

			<text
				x="150"
				y="140"
				text-anchor="middle"
				fill="rgb(71, 85, 105)"
				font-size="11"
				font-weight="bold"
				opacity="0.9"
			>
				{speedText()}
			</text>

			<text
				x="150"
				y="120"
				text-anchor="middle"
				fill="rgb(71, 85, 105)"
				font-size="18"
				font-weight="bold"
			>
				{Math.round(currentPercent())}%
			</text>
		</svg>
	);
}
