extends Node3D

const API_FALLBACK := "https://pet.leagueofhu3.com.br"
var api_base := API_FALLBACK
var pet_id := ""
var pet_data: Dictionary = {}
var status_label: Label
var pet_label: Label
var stat_label: Label
var toast_label: Label
var camera: Camera3D
var pet_root: Node3D
var pet_home := Vector3(0, 0.45, 1.0)
var pet_target := Vector3(0, 0.45, 1.0)
var pet_time := 0.0
var walk_time := 0.0
var interact_lock := 0.0

const C_WALL := Color("#eadbc9")
const C_FLOOR := Color("#a87856")
const C_WOOD := Color("#8d6048")
const C_CREAM := Color("#f5ead9")
const C_GREEN := Color("#759a67")
const C_PINK := Color("#d48d91")
const C_BLUE := Color("#7089a8")
const C_DARK := Color("#3d302b")
const C_GOLD := Color("#d7a254")

func _ready() -> void:
    if OS.has_feature("web"):
        var origin = JavaScriptBridge.eval("window.location.origin")
        if origin is String and not origin.is_empty():
            api_base = origin
        var query = JavaScriptBridge.eval("new URLSearchParams(window.location.search).get('petId') || ''")
        if query is String:
            pet_id = query
    build_world()
    build_ui()
    choose_next_pet_target()
    if not pet_id.is_empty():
        load_pet()
    else:
        set_status("Modo visual · crie um pet na tela anterior.")

func build_world() -> void:
    camera = Camera3D.new()
    add_child(camera)
    camera.position = Vector3(8.7, 8.2, 8.7)
    camera.look_at_from_position(camera.position, Vector3(0, 0.3, 0), Vector3.UP)
    camera.projection = Camera3D.PROJECTION_ORTHOGONAL
    camera.size = 10.6

    var env := WorldEnvironment.new()
    var environment := Environment.new()
    environment.background_mode = Environment.BG_COLOR
    environment.background_color = Color("#c8b19b")
    environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
    environment.ambient_light_color = Color("#fff0dc")
    environment.ambient_light_energy = 0.9
    environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
    env.environment = environment
    add_child(env)

    var key := DirectionalLight3D.new()
    key.rotation_degrees = Vector3(-48, -32, 0)
    key.light_color = Color("#ffe4bd")
    key.light_energy = 1.3
    key.shadow_enabled = true
    add_child(key)

    make_box("Floor", Vector3(12, 0.2, 8), Vector3(0, -0.1, 0), C_FLOOR)
    make_box("BackWall", Vector3(12, 3.4, 0.22), Vector3(0, 1.6, -3.9), C_WALL)
    make_box("SideWall", Vector3(0.22, 3.4, 8), Vector3(-5.9, 1.6, 0), C_WALL)

    make_rug(Vector3(-0.2, 0.015, 0.8), Vector2(5.2, 3.0), Color("#c99e82"))
    make_bed(Vector3(-3.25, 0.55, -1.55))
    make_desk(Vector3(2.7, 0.55, -2.65))
    make_wardrobe(Vector3(4.7, 1.25, 0.4))
    make_plant(Vector3(-4.5, 0.6, -2.7))
    make_window(Vector3(0.0, 2.35, -3.72))
    make_lamp(Vector3(1.1, 1.2, -2.55))

    pet_root = Node3D.new()
    pet_root.name = "Pet"
    add_child(pet_root)
    pet_root.position = pet_home
    make_pet()

func make_box(n: String, size: Vector3, pos: Vector3, color: Color, clickable := false, action := "") -> StaticBody3D:
    var body := StaticBody3D.new()
    body.name = n
    body.position = pos
    body.collision_layer = 1
    body.collision_mask = 1
    add_child(body)
    var mesh := MeshInstance3D.new()
    var box := BoxMesh.new()
    box.size = size
    mesh.mesh = box
    mesh.material_override = mat(color)
    body.add_child(mesh)
    var shape := CollisionShape3D.new()
    var collision := BoxShape3D.new()
    collision.size = size
    shape.shape = collision
    body.add_child(shape)
    if clickable:
        body.input_ray_pickable = true
        body.input_event.connect(func(_camera, event, _pos, _normal, _shape):
            if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
                interact(action))
    return body

func mat(color: Color) -> StandardMaterial3D:
    var m := StandardMaterial3D.new()
    m.albedo_color = color
    m.roughness = 0.65
    return m

func make_rug(pos: Vector3, size: Vector2, color: Color) -> void:
    make_box("Rug", Vector3(size.x, 0.035, size.y), pos, color)

func make_bed(pos: Vector3) -> void:
    make_box("BedFrame", Vector3(3.0, 0.45, 2.0), pos, C_WOOD)
    make_box("Mattress", Vector3(2.8, 0.34, 1.82), pos + Vector3(0, 0.37, 0), C_CREAM, true, "bed")
    make_box("Pillow", Vector3(1.0, 0.18, 0.65), pos + Vector3(-0.72, 0.62, -0.35), Color("#d8b5a5"))

func make_desk(pos: Vector3) -> void:
    make_box("DeskTop", Vector3(3.0, 0.18, 1.05), pos, C_WOOD, true, "pc")
    for x in [-1.25, 1.25]:
        make_box("DeskLeg", Vector3(0.16, 1.0, 0.16), pos + Vector3(x, -0.5, 0), C_DARK)
    make_box("Monitor", Vector3(1.25, 0.78, 0.10), pos + Vector3(0, 0.56, -0.22), C_DARK, true, "pc")
    make_box("Screen", Vector3(1.05, 0.56, 0.02), pos + Vector3(0, 0.56, -0.285), C_BLUE)
    make_box("Keyboard", Vector3(1.05, 0.06, 0.38), pos + Vector3(0, 0.19, 0.18), Color("#d4c2b0"))
    make_box("Chair", Vector3(0.8, 0.8, 0.8), pos + Vector3(0, -0.15, 1.0), C_GREEN)

func make_wardrobe(pos: Vector3) -> void:
    make_box("Wardrobe", Vector3(1.65, 2.6, 1.15), pos, C_WOOD, true, "wardrobe")
    make_box("WardrobePanel", Vector3(0.68, 2.15, 0.03), pos + Vector3(-0.42, 0, -0.59), Color("#b27c5c"))
    make_box("WardrobePanel2", Vector3(0.68, 2.15, 0.03), pos + Vector3(0.42, 0, -0.59), Color("#b27c5c"))

func make_plant(pos: Vector3) -> void:
    make_box("Pot", Vector3(0.65, 0.55, 0.65), pos, Color("#c57e67"))
    for offset in [Vector3(0,0.55,0),Vector3(0.25,0.72,0),Vector3(-0.25,0.68,0)]:
        var leaf := MeshInstance3D.new()
        var sphere := SphereMesh.new()
        sphere.radius = 0.35
        sphere.height = 0.65
        leaf.mesh = sphere
        leaf.position = pos + offset
        leaf.material_override = mat(C_GREEN)
        add_child(leaf)

func make_window(pos: Vector3) -> void:
    make_box("WindowFrame", Vector3(3.4, 2.1, 0.15), pos, C_WOOD)
    make_box("WindowSky", Vector3(3.0, 1.72, 0.04), pos + Vector3(0,0,-0.09), Color("#8ca8ba"))
    make_box("WindowMoon", Vector3(0.42,0.42,0.05), pos + Vector3(0.8,0.55,-0.12), C_CREAM)

func make_lamp(pos: Vector3) -> void:
    make_box("LampStand", Vector3(0.12,1.0,0.12), pos, C_DARK)
    make_box("LampShade", Vector3(0.75,0.35,0.75), pos + Vector3(0,0.62,0), C_GOLD)

func make_pet() -> void:
    var body := MeshInstance3D.new()
    var body_mesh := CapsuleMesh.new()
    body_mesh.radius = 0.46
    body_mesh.height = 0.95
    body.mesh = body_mesh
    body.material_override = mat(Color("#b88961"))
    body.position = Vector3(0, 0.52, 0)
    pet_root.add_child(body)

    var head := MeshInstance3D.new()
    var head_mesh := SphereMesh.new()
    head_mesh.radius = 0.62
    head_mesh.height = 1.1
    head.mesh = head_mesh
    head.material_override = mat(Color("#c99a70"))
    head.position = Vector3(0, 1.05, -0.06)
    pet_root.add_child(head)

    for x in [-0.42, 0.42]:
        var ear := MeshInstance3D.new()
        var ear_mesh := SphereMesh.new()
        ear_mesh.radius = 0.24
        ear_mesh.height = 0.45
        ear.mesh = ear_mesh
        ear.position = Vector3(x, 1.48, -0.03)
        ear.scale = Vector3(0.8, 1.2, 0.5)
        ear.material_override = mat(Color("#a66f50"))
        pet_root.add_child(ear)

    for x in [-0.2, 0.2]:
        var eye := MeshInstance3D.new()
        var eye_mesh := SphereMesh.new()
        eye_mesh.radius = 0.075
        eye_mesh.height = 0.15
        eye.mesh = eye_mesh
        eye.position = Vector3(x, 1.12, -0.58)
        eye.material_override = mat(C_DARK)
        pet_root.add_child(eye)

    var belly := MeshInstance3D.new()
    var belly_mesh := SphereMesh.new()
    belly_mesh.radius = 0.32
    belly_mesh.height = 0.5
    belly.mesh = belly_mesh
    belly.position = Vector3(0, 0.55, -0.42)
    belly.material_override = mat(Color("#f1dcc0"))
    pet_root.add_child(belly)

func build_ui() -> void:
    var ui := CanvasLayer.new()
    add_child(ui)

    var top := Panel.new()
    top.position = Vector2(24, 20)
    top.size = Vector2(310, 105)
    top.modulate = Color(1,1,1,0.94)
    ui.add_child(top)

    pet_label = Label.new()
    pet_label.position = Vector2(18, 12)
    pet_label.add_theme_font_size_override("font_size", 24)
    pet_label.add_theme_color_override("font_color", C_DARK)
    pet_label.text = "HU3 PET"
    top.add_child(pet_label)

    stat_label = Label.new()
    stat_label.position = Vector2(18, 48)
    stat_label.add_theme_font_size_override("font_size", 13)
    stat_label.add_theme_color_override("font_color", Color("#725b4c"))
    stat_label.text = "Carregando pet..."
    top.add_child(stat_label)

    var hint := Label.new()
    hint.position = Vector2(24, 140)
    hint.add_theme_font_size_override("font_size", 13)
    hint.add_theme_color_override("font_color", Color("#fff8ee"))
    hint.text = "Clique no PC, cama ou guarda-roupa"
    ui.add_child(hint)

    toast_label = Label.new()
    toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    toast_label.position = Vector2(0, 625)
    toast_label.size = Vector2(1280, 50)
    toast_label.add_theme_font_size_override("font_size", 18)
    toast_label.add_theme_color_override("font_color", Color("#fff8ee"))
    toast_label.text = "Seu pet está esperando..."
    ui.add_child(toast_label)

func set_status(text: String) -> void:
    if toast_label:
        toast_label.text = text

func load_pet() -> void:
    var req := HTTPRequest.new()
    add_child(req)
    req.request_completed.connect(_on_pet_loaded)
    var err := req.request(api_base + "/api/pets?id=" + pet_id)
    if err != OK:
        set_status("Não consegui conectar ao pet. O quarto continua jogável.")

func _on_pet_loaded(_result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
    if response_code < 200 or response_code >= 300:
        set_status("Quarto carregado · API indisponível")
        return
    var parsed = JSON.parse_string(body.get_string_from_utf8())
    if typeof(parsed) == TYPE_DICTIONARY:
        pet_data = parsed.get("pet", parsed)
        refresh_pet_ui()

func refresh_pet_ui() -> void:
    var name := str(pet_data.get("name", "Pudim"))
    var tier := str(pet_data.get("rank_tier", "IRON"))
    var div := int(pet_data.get("rank_division", 4))
    var lp := int(pet_data.get("lp", 0))
    var stamina := int(pet_data.get("stamina", 0))
    var stress := int(pet_data.get("stress", 0))
    pet_label.text = name
    stat_label.text = "%s %s  ·  %d LP\n⚡ %d   😵 %d" % [tier, "" if tier in ["MASTER","GRANDMASTER","CHALLENGER"] else str(div), lp, stamina, stress]

func interact(action: String) -> void:
    if interact_lock > 0:
        return
    interact_lock = 0.8
    match action:
        "pc":
            set_status("🖥️ O PC acendeu. Seu pet quer treinar ou jogar ranqueada.")
        "bed":
            set_status("🛏️ Hora de descansar. O quarto fica silencioso.")
            pet_target = Vector3(-3.1, 0.45, -1.1)
        "wardrobe":
            set_status("👕 Guarda-roupa: aqui entram os equipamentos e cosméticos.")

func _process(delta: float) -> void:
    pet_time += delta
    interact_lock = max(0.0, interact_lock - delta)
    if pet_root:
        var dist := pet_root.position.distance_to(pet_target)
        if dist > 0.12:
            pet_root.position = pet_root.position.move_toward(pet_target, delta * 1.15)
            pet_root.rotation.y = lerp_angle(pet_root.rotation.y, atan2(pet_target.x - pet_root.position.x, pet_target.z - pet_root.position.z), delta * 5.0)
            walk_time += delta * 8.0
        else:
            walk_time = 0.0
        pet_root.position.y = 0.45 + sin(pet_time * 2.2) * 0.035
    if int(pet_time) % 7 == 0 and walk_time == 0.0 and pet_target.distance_to(pet_home) < 0.2:
        choose_next_pet_target()

func choose_next_pet_target() -> void:
    var points := [Vector3(-1.7,0.45,0.8),Vector3(1.0,0.45,0.9),Vector3(0.8,0.45,-1.0),Vector3(-1.0,0.45,1.5)]
    pet_target = points[randi() % points.size()]
