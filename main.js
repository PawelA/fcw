const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const build_color = "#bcdbf9"
const goal_color  = "#f19191"

{
	const r = 0.529 * 256;
	const g = 0.741 * 256;
	const b = 0.945 * 256;
	canvas.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
}

ctx.translate(300, 400);
ctx.scale(0.4, 0.4)

async function main() {
	const import_object = {
		'env': { 'log': console.log }
	};
	const module = await WebAssembly.instantiateStreaming(
		fetch("fcsim.wasm"), import_object
	);
	const instance = module.instance;

	instance.exports.memory.grow(100);

	const xml_res = await fetch("galois.xml");
	const xml_buf = await xml_res.arrayBuffer();
	const xml = new Uint8Array(xml_buf);

	const xml_c_ptr = instance.exports.malloc(xml.length + 1);
	const xml_c_arr = new Uint8Array(
		instance.exports.memory.buffer,
		xml_c_ptr,
		xml.length + 1
	);
	xml_c_arr.set(xml);

	const arena_c_ptr = instance.exports.malloc(72);
	const res = instance.exports.fcsim_read_xml(xml_c_ptr, arena_c_ptr);
	if (res)
		return;
	const handle_c_ptr = instance.exports.fcsim_new(arena_c_ptr);

	// for (let i = 0; i < 1000; i++)
	setInterval(() => {
		instance.exports.fcsim_step(handle_c_ptr);

	const view = new DataView(instance.exports.memory.buffer);

	const blocks_c_ptr = view.getUint32(arena_c_ptr, true);
	const block_cnt = view.getUint32(arena_c_ptr + 4, true);
	const build_x = view.getFloat64(arena_c_ptr + 8, true);
	const build_y = view.getFloat64(arena_c_ptr + 16, true);
	const build_w = view.getFloat64(arena_c_ptr + 24, true);
	const build_h = view.getFloat64(arena_c_ptr + 32, true);
	const goal_x = view.getFloat64(arena_c_ptr + 40, true);
	const goal_y = view.getFloat64(arena_c_ptr + 48, true);
	const goal_w = view.getFloat64(arena_c_ptr + 56, true);
	const goal_h = view.getFloat64(arena_c_ptr + 64, true);

	ctx.clearRect(-2000, -2000, 20000, 20000);

	const build_l = build_x - build_w / 2;
	const build_b = build_y - build_h / 2;
	ctx.fillStyle = build_color;
	ctx.fillRect(build_l, build_b, build_w, build_h);
	
	const goal_l = goal_x - goal_w / 2;
	const goal_b = goal_y - goal_h / 2;
	ctx.fillStyle = goal_color;
	ctx.fillRect(goal_l, goal_b, goal_w, goal_h);

	for (let i = 0; i < block_cnt; i++) {
		const off = blocks_c_ptr + i * 64;
		const type = view.getUint32(off, true);
		const id = view.getInt32(off + 4, true);
		const x = view.getFloat64(off + 8, true);
		const y = view.getFloat64(off + 16, true);
		const w = view.getFloat64(off + 24, true);
		const h = view.getFloat64(off + 32, true);
		const angle = view.getFloat64(off + 40, true);
		const joint_cnt = view.getUint32(off + 56, true);
		let joints = [];
		for (let j = 0; j < joint_cnt; j++)
			joints.push(view.getInt32(off + 48 + j * 4, true));

		const blocks = [
			{ "circle": false, "color": "#00be01" },
			{ "circle": true , "color": "#00be01" },
			{ "circle": false, "color": "#f9da2f" },
			{ "circle": true , "color": "#f9892f" },
			{ "circle": false, "color": "#ff6666" },
			{ "circle": true , "color": "#ff6666" },
			{ "circle": true , "color": "#0a69fd" },
			{ "circle": true , "color": "#fc8003" },
			{ "circle": true , "color": "#d147a5" },
			{ "circle": false, "color": "#0000ff" },
			{ "circle": false, "color": "#6b3400" }
		];
		const circle = blocks[type].circle;
		const color = blocks[type].color;

		ctx.fillStyle = color;
		ctx.beginPath();
		if (circle) {
			ctx.arc(x, y, w / 2, 0, Math.PI * 2, true);
		} else {
			const sina = Math.sin(angle);
			const cosa = Math.cos(angle);
			const wc = Math.max(4, w) * cosa / 2;
			const ws = Math.max(4, w) * sina / 2;
			const hc = Math.max(4, h) * cosa / 2;
			const hs = Math.max(4, h) * sina / 2;
			ctx.moveTo( wc - hs + x,  ws + hc + y);
			ctx.lineTo(-wc - hs + x, -ws + hc + y);
			ctx.lineTo(-wc + hs + x, -ws - hc + y);
			ctx.lineTo( wc + hs + x,  ws - hc + y);
		}
		ctx.fill();
	}}, 10);
}

main();
