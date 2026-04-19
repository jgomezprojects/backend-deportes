import os
from typing import Any, List, Optional

import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import sql
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_connection():
    url = os.getenv(
        "DATABASE_URL",
        "postgresql://neondb_owner:npg_CHvqgf8ubn7L@ep-quiet-morning-amm06n7v-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    )
    return psycopg2.connect(url, sslmode="require")


def _find_first_existing(cursor, table: str, candidates: List[str]) -> Optional[str]:
    for candidate in candidates:
        cursor.execute(
            """
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = %s
              AND column_name = %s
            LIMIT 1
            """,
            (table, candidate),
        )
        if cursor.fetchone():
            return candidate
    return None


def _resolve_users_mapping(conn) -> dict:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name IN ('usuarios', 'users', 'usuario', 'user')
        ORDER BY CASE table_name
            WHEN 'usuarios' THEN 1
            WHEN 'users' THEN 2
            WHEN 'usuario' THEN 3
            WHEN 'user' THEN 4
            ELSE 99
        END
        LIMIT 1
        """
    )
    table_row = cur.fetchone()
    if not table_row:
        cur.close()
        raise Exception(
            "No se encontró tabla de usuarios (usuarios/users/usuario/user) en schema public."
        )

    users_table = table_row[0]
    mapping = {
        "table": users_table,
        "id": _find_first_existing(cur, users_table, ["id", "user_id"]),
        "role": _find_first_existing(cur, users_table, ["role_id", "rol_id", "role"]),
        "password": _find_first_existing(cur, users_table, ["password", "pass", "clave"]),
        "nombre": _find_first_existing(
            cur, users_table, ["nombre", "username", "user_name", "name"]
        ),
        "email": _find_first_existing(cur, users_table, ["email", "correo"]),
    }
    cur.close()

    if not mapping["id"]:
        raise Exception(f"La tabla {users_table} no tiene columna id/user_id.")
    if not mapping["role"]:
        raise Exception(f"La tabla {users_table} no tiene columna role_id/rol_id/role.")
    if not mapping["password"]:
        raise Exception(f"La tabla {users_table} no tiene columna password/pass/clave.")
    if not mapping["nombre"] and not mapping["email"]:
        raise Exception(
            f"La tabla {users_table} no tiene columnas de identidad (nombre/username/name/email/correo)."
        )
    return mapping


class LoginRequest(BaseModel):
    nombre: str
    password: str
    role_id: int


class RegisterRequest(BaseModel):
    nombre: str
    email: Optional[str] = None
    password: str
    role_id: int = 1
    career: Optional[str] = None


@app.post("/auth/register")
def register_user(req: RegisterRequest):
    identidad = req.nombre.strip()
    if not identidad:
        return {"error": "El nombre de usuario es obligatorio"}
    if not req.password or not req.password.strip():
        return {"error": "La contraseña es obligatoria"}
    if req.role_id == 1 and (not req.career or not req.career.strip()):
        return {"error": "Para estudiantes, la carrera es obligatoria"}

    try:
        conn = get_connection()
        cursor = conn.cursor()
        users = _resolve_users_mapping(conn)
        display_col = users["nombre"] or users["email"]
        email_val = req.email.strip() if req.email else None

        where_parts = [
            sql.SQL("{} = %s").format(sql.Identifier(display_col))
        ]
        params: List[Any] = [identidad]
        if users["email"] and email_val:
            where_parts.append(
                sql.SQL("{} = %s").format(sql.Identifier(users["email"]))
            )
            params.append(email_val)

        cursor.execute(
            sql.SQL(
                "SELECT {id_col} FROM {users_table} WHERE {where_clause} LIMIT 1"
            ).format(
                id_col=sql.Identifier(users["id"]),
                users_table=sql.Identifier(users["table"]),
                where_clause=sql.SQL(" OR ").join(where_parts),
            ),
            tuple(params),
        )
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return {"error": "Ya existe un usuario con ese nombre o correo"}

        insert_cols = [
            sql.Identifier(display_col),
            sql.Identifier(users["password"]),
            sql.Identifier(users["role"]),
        ]
        insert_vals: List[Any] = [identidad, req.password, req.role_id]
        if users["email"]:
            insert_cols.append(sql.Identifier(users["email"]))
            insert_vals.append(email_val or identidad)

        cursor.execute(
            sql.SQL(
                "INSERT INTO {users_table} ({cols}) VALUES ({vals}) RETURNING {id_col}"
            ).format(
                users_table=sql.Identifier(users["table"]),
                cols=sql.SQL(", ").join(insert_cols),
                vals=sql.SQL(", ").join(sql.SQL("%s") for _ in insert_vals),
                id_col=sql.Identifier(users["id"]),
            ),
            tuple(insert_vals),
        )
        new_user_id = cursor.fetchone()[0]

        if req.role_id == 1:
            career_val = req.career.strip()
            cursor.execute(
                """
                INSERT INTO students (user_id, career)
                VALUES (%s, %s)
                """,
                (new_user_id, career_val),
            )

        conn.commit()
        cursor.close()
        conn.close()
        return {
            "mensaje": "Usuario registrado",
            "id": new_user_id,
            "role_id": req.role_id,
            "nombre": identidad,
            "career": req.career.strip() if req.career else None,
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/login")
def login(req: LoginRequest):
    nombre = req.nombre.strip()
    if not nombre:
        return {"error": "Indica usuario o nombre"}

    try:
        conn = get_connection()
        cursor = conn.cursor()
        users = _resolve_users_mapping(conn)

        where_match = []
        params: List[Any] = []
        if users["nombre"]:
            where_match.append(
                sql.SQL("{} = %s").format(sql.Identifier(users["nombre"]))
            )
            params.append(nombre)
        if users["email"]:
            where_match.append(sql.SQL("{} = %s").format(sql.Identifier(users["email"])))
            params.append(nombre)
        params.append(req.password)

        display_col = users["nombre"] or users["email"]
        query = sql.SQL(
            "SELECT {id_col}, {role_col}, {display_col} "
            "FROM {users_table} "
            "WHERE ({name_or_email}) AND {password_col} = %s"
        ).format(
            id_col=sql.Identifier(users["id"]),
            role_col=sql.Identifier(users["role"]),
            display_col=sql.Identifier(display_col),
            users_table=sql.Identifier(users["table"]),
            name_or_email=sql.SQL(" OR ").join(where_match),
            password_col=sql.Identifier(users["password"]),
        )
        cursor.execute(query, tuple(params))
        row = cursor.fetchone()
        cursor.close()
        conn.close()
    except Exception as e:
        err = str(e).lower()
        if "password" in err or "column" in err:
            return {
                "error": "Añade la columna password en usuarios (ver sql/neon_login.sql) o revisa el esquema.",
            }
        return {"error": str(e)}

    if not row:
        return {"error": "Usuario o contraseña incorrectos"}

    user_id, db_role_id, nombre_db = row[0], row[1], row[2]
    if db_role_id != req.role_id:
        return {"error": "El rol seleccionado no coincide con tu cuenta"}

    return {"id": user_id, "role_id": db_role_id, "nombre": nombre_db}


@app.get("/")
def inicio():
    return {"mensaje": "Backend funcionando"}


@app.get("/usuarios")
def get_usuarios():
    conn = get_connection()
    cursor = conn.cursor()
    users = _resolve_users_mapping(conn)

    cursor.execute(
        sql.SQL("SELECT * FROM {users_table};").format(
            users_table=sql.Identifier(users["table"])
        )
    )
    data = cursor.fetchall()

    cursor.close()
    conn.close()

    return data


@app.get("/usuarios/list")
def list_usuarios():
    """Lista usuarios como objetos (sin contraseña) para paneles de administración."""
    conn = get_connection()
    cursor = conn.cursor()
    users = _resolve_users_mapping(conn)
    display_col = users["nombre"] or users["email"]
    cursor.execute(
        sql.SQL(
            "SELECT {id_col}, {display_col}, {role_col} "
            "FROM {users_table} "
            "ORDER BY {id_col};"
        ).format(
            id_col=sql.Identifier(users["id"]),
            display_col=sql.Identifier(display_col),
            role_col=sql.Identifier(users["role"]),
            users_table=sql.Identifier(users["table"]),
        )
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {"id": r[0], "nombre": r[1], "role_id": r[2]}
        for r in rows
    ]


@app.get("/profesores")
def list_profesores():
    """Usuarios con rol profesor."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        users = _resolve_users_mapping(conn)
        display_col = users["nombre"] or users["email"]
        cursor.execute(
            sql.SQL(
                "SELECT {id_col}, {display_col} "
                "FROM {users_table} "
                "WHERE {role_col} = 2 "
                "ORDER BY {display_col};"
            ).format(
                id_col=sql.Identifier(users["id"]),
                display_col=sql.Identifier(display_col),
                role_col=sql.Identifier(users["role"]),
                users_table=sql.Identifier(users["table"]),
            )
        )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return [{"id": r[0], "nombre": r[1]} for r in rows]
    except Exception as e:
        return {"error": str(e)}


def _horarios_sql_base(users: dict):
    display_col = users["nombre"] or users["email"]
    return sql.SQL(
        """
        SELECT
            s.id,
            sp.name AS deporte,
            l.name AS lugar,
            sl.level AS nivel,
            s.day,
            s.hour,
            s.capacity,
            s.instructor_id,
            prof.{display_col} AS instructor_nombre
        FROM schedules s
        JOIN sports sp ON s.sport_id = sp.id
        JOIN locations l ON s.location_id = l.id
        JOIN sport_levels sl ON s.level_id = sl.id
        LEFT JOIN {users_table} prof ON prof.{id_col} = s.instructor_id
    """
    ).format(
        display_col=sql.Identifier(display_col),
        users_table=sql.Identifier(users["table"]),
        id_col=sql.Identifier(users["id"]),
    )


@app.get("/horarios")
def get_horarios(instructor_id: Optional[int] = None):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        users = _resolve_users_mapping(conn)

        if instructor_id is not None:
            cursor.execute(
                _horarios_sql_base(users)
                + sql.SQL(" WHERE s.instructor_id = %s ORDER BY s.day, s.hour;"),
                (instructor_id,),
            )
        else:
            cursor.execute(
                _horarios_sql_base(users) + sql.SQL(" ORDER BY s.day, s.hour;"),
            )

        data = cursor.fetchall()

        cursor.close()
        conn.close()

        return data

    except Exception as e:
        err = str(e).lower()
        if "instructor_id" in err:
            return {
                "error": "Falta la columna schedules.instructor_id. Ejecuta sql/schedules_instructor.sql en Neon.",
            }
        return {"error": str(e)}


@app.get("/schedules")
def get_schedules(instructor_id: Optional[int] = None):
    return get_horarios(instructor_id)


class InstructorUpdate(BaseModel):
    instructor_id: Optional[int] = None


class ScheduleCreate(BaseModel):
    sport_id: int
    location_id: int
    level_id: int
    day: str
    hour: str
    capacity: int
    instructor_id: Optional[int] = None


@app.get("/sports")
def list_sports():
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, name FROM sports ORDER BY name;")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return rows
    except Exception as e:
        return {"error": str(e)}


@app.get("/locations")
def list_locations():
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, name FROM locations ORDER BY name;")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return rows
    except Exception as e:
        return {"error": str(e)}


@app.get("/sport-levels")
def list_sport_levels():
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, level FROM sport_levels ORDER BY level;")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return rows
    except Exception as e:
        return {"error": str(e)}


@app.post("/schedules")
def create_schedule(body: ScheduleCreate):
    try:
        if body.capacity <= 0:
            return {"error": "La capacidad debe ser mayor que 0"}
        if not body.day.strip() or not body.hour.strip():
            return {"error": "Indica día y hora"}

        conn = get_connection()
        cur = conn.cursor()
        users = _resolve_users_mapping(conn)

        if body.instructor_id is not None:
            cur.execute(
                sql.SQL(
                    "SELECT {id_col} FROM {users_table} WHERE {id_col} = %s AND {role_col} = 2"
                ).format(
                    id_col=sql.Identifier(users["id"]),
                    users_table=sql.Identifier(users["table"]),
                    role_col=sql.Identifier(users["role"]),
                ),
                (body.instructor_id,),
            )
            if not cur.fetchone():
                cur.close()
                conn.close()
                return {"error": "El instructor seleccionado no es profesor"}

        cur.execute("SELECT id FROM sports WHERE id = %s", (body.sport_id,))
        if not cur.fetchone():
            cur.close()
            conn.close()
            return {"error": "Deporte no válido"}
        cur.execute("SELECT id FROM locations WHERE id = %s", (body.location_id,))
        if not cur.fetchone():
            cur.close()
            conn.close()
            return {"error": "Lugar no válido"}
        cur.execute("SELECT id FROM sport_levels WHERE id = %s", (body.level_id,))
        if not cur.fetchone():
            cur.close()
            conn.close()
            return {"error": "Nivel no válido"}

        cur.execute(
            """
            INSERT INTO schedules (sport_id, location_id, level_id, day, hour, capacity, instructor_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                body.sport_id,
                body.location_id,
                body.level_id,
                body.day.strip(),
                body.hour.strip(),
                body.capacity,
                body.instructor_id,
            ),
        )
        schedule_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return {"mensaje": "Horario creado", "id": schedule_id}
    except Exception as e:
        return {"error": str(e)}


@app.patch("/schedules/{schedule_id}/instructor")
def patch_schedule_instructor(schedule_id: int, body: InstructorUpdate):
    """Asigna o quita el profesor de un horario (panel admin)."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        users = _resolve_users_mapping(conn)

        if body.instructor_id is not None:
            cursor.execute(
                sql.SQL(
                    "SELECT {id_col} FROM {users_table} WHERE {id_col} = %s AND {role_col} = 2"
                ).format(
                    id_col=sql.Identifier(users["id"]),
                    users_table=sql.Identifier(users["table"]),
                    role_col=sql.Identifier(users["role"]),
                ),
                (body.instructor_id,),
            )
            if not cursor.fetchone():
                cursor.close()
                conn.close()
                return {"error": "El usuario no es un profesor válido"}

        cursor.execute(
            "UPDATE schedules SET instructor_id = %s WHERE id = %s",
            (body.instructor_id, schedule_id),
        )
        if cursor.rowcount == 0:
            cursor.close()
            conn.close()
            return {"error": "Horario no encontrado"}

        conn.commit()
        cursor.close()
        conn.close()
        return {"mensaje": "Profesor actualizado"}

    except Exception as e:
        err = str(e).lower()
        if "instructor_id" in err:
            return {
                "error": "Falta schedules.instructor_id. Ejecuta sql/schedules_instructor.sql en Neon.",
            }
        return {"error": str(e)}


class Reserva(BaseModel):
    user_id: int
    schedule_id: int


@app.post("/reservas")
def crear_reserva(reserva: Reserva):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM reservations WHERE user_id = %s AND schedule_id = %s",
            (reserva.user_id, reserva.schedule_id),
        )
        existe = cursor.fetchone()

        if existe:
            return {"error": "Ya estás inscrito en este horario"}

        cursor.execute(
            "SELECT capacity FROM schedules WHERE id = %s",
            (reserva.schedule_id,),
        )
        capacidad = cursor.fetchone()

        cursor.execute(
            "SELECT COUNT(*) FROM reservations WHERE schedule_id = %s",
            (reserva.schedule_id,),
        )
        inscritos = cursor.fetchone()

        if inscritos[0] >= capacidad[0]:
            return {"error": "No hay cupos disponibles"}

        cursor.execute(
            "INSERT INTO reservations (user_id, schedule_id) VALUES (%s, %s)",
            (reserva.user_id, reserva.schedule_id),
        )

        conn.commit()
        cursor.close()
        conn.close()

        return {"mensaje": "Inscripción exitosa"}

    except Exception as e:
        return {"error": str(e)}


def _reserva_select_extra(users: dict):
    display_col = users["nombre"] or users["email"]
    return sql.SQL(
        """
            SELECT
                r.id,
                u.{display_col},
                sp.name AS deporte,
                s.day,
                s.hour,
                s.id AS schedule_id,
                prof.{display_col} AS instructor_nombre
            FROM reservations r
            JOIN {users_table} u ON r.user_id = u.{id_col}
            JOIN schedules s ON r.schedule_id = s.id
            JOIN sports sp ON s.sport_id = sp.id
            LEFT JOIN {users_table} prof ON prof.{id_col} = s.instructor_id
    """
    ).format(
        display_col=sql.Identifier(display_col),
        users_table=sql.Identifier(users["table"]),
        id_col=sql.Identifier(users["id"]),
    )


@app.get("/reservas")
def ver_reservas(
    user_id: Optional[int] = None,
    instructor_id: Optional[int] = None,
):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        users = _resolve_users_mapping(conn)
        display_col = users["nombre"] or users["email"]

        if user_id is not None:
            cursor.execute(
                _reserva_select_extra(users)
                + sql.SQL(" WHERE r.user_id = %s ORDER BY s.day, s.hour;"),
                (user_id,),
            )
        elif instructor_id is not None:
            cursor.execute(
                _reserva_select_extra(users)
                + sql.SQL(" WHERE s.instructor_id = %s ORDER BY s.day, s.hour, u.{display_col};").format(
                    display_col=sql.Identifier(display_col)
                ),
                (instructor_id,),
            )
        else:
            cursor.execute(
                _reserva_select_extra(users) + sql.SQL(" ORDER BY s.day, s.hour;"),
            )

        data = cursor.fetchall()

        cursor.close()
        conn.close()

        return data

    except Exception as e:
        err = str(e).lower()
        if "instructor_id" in err:
            return {
                "error": "Falta schedules.instructor_id o JOIN. Revisa sql/schedules_instructor.sql.",
            }
        return {"error": str(e)}


@app.get("/calificaciones")
def listar_calificaciones(
    user_id: Optional[int] = None,
    instructor_id: Optional[int] = None,
) -> Any:
    """
    Estudiante: user_id -> notas de sus reservas.
    Profesor: instructor_id -> alumnos en sus clases con nota si existe.
    """
    if user_id is None and instructor_id is None:
        return {"error": "Indica user_id o instructor_id"}

    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        users = _resolve_users_mapping(conn)
        display_col = users["nombre"] or users["email"]

        if user_id is not None:
            cur.execute(
                sql.SQL(
                    """
                SELECT
                    r.id AS reservation_id,
                    sp.name AS deporte,
                    s.day,
                    s.hour,
                    prof.{display_col} AS instructor_nombre,
                    rt.id AS rating_id,
                    rt.rating AS score,
                    rt.comment
                FROM reservations r
                JOIN schedules s ON r.schedule_id = s.id
                JOIN sports sp ON s.sport_id = sp.id
                LEFT JOIN {users_table} prof ON prof.{id_col} = s.instructor_id
                LEFT JOIN ratings rt ON rt.reservation_id = r.id
                WHERE r.user_id = %s
                ORDER BY s.day, s.hour;
                """
                ).format(
                    display_col=sql.Identifier(display_col),
                    users_table=sql.Identifier(users["table"]),
                    id_col=sql.Identifier(users["id"]),
                ),
                (user_id,),
            )
        else:
            cur.execute(
                sql.SQL(
                    """
                SELECT
                    r.id AS reservation_id,
                    u.{display_col} AS estudiante_nombre,
                    sp.name AS deporte,
                    s.day,
                    s.hour,
                    s.id AS schedule_id,
                    rt.id AS rating_id,
                    rt.rating AS score,
                    rt.comment
                FROM reservations r
                JOIN {users_table} u ON r.user_id = u.{id_col}
                JOIN schedules s ON r.schedule_id = s.id
                JOIN sports sp ON s.sport_id = sp.id
                LEFT JOIN ratings rt ON rt.reservation_id = r.id
                WHERE s.instructor_id = %s
                ORDER BY s.day, s.hour, u.{display_col};
                """
                ).format(
                    display_col=sql.Identifier(display_col),
                    users_table=sql.Identifier(users["table"]),
                    id_col=sql.Identifier(users["id"]),
                ),
                (instructor_id,),
            )

        rows: List[dict] = cur.fetchall()
        cur.close()
        conn.close()

        for row in rows:
            if row.get("score") is not None:
                try:
                    row["score"] = float(row["score"])
                except (TypeError, ValueError):
                    pass

        return rows

    except Exception as e:
        err = str(e).lower()
        if "ratings" in err or "does not exist" in err:
            return {
                "error": "Tabla o columnas de ratings no encontradas. Revisa sql/ratings_expected.sql.",
            }
        if "score" in err and "rating" in err:
            return {
                "error": "La tabla ratings debe tener columna rating o score (ver sql/ratings_expected.sql).",
            }
        return {"error": str(e)}


class CalificacionUpsert(BaseModel):
    reservation_id: int
    rating: float
    comment: Optional[str] = None
    instructor_user_id: int


@app.post("/calificaciones")
def crear_o_actualizar_calificacion(body: CalificacionUpsert):
    """Profesor: guarda nota para una reserva de su clase."""
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT s.instructor_id
            FROM reservations r
            JOIN schedules s ON r.schedule_id = s.id
            WHERE r.id = %s
            """,
            (body.reservation_id,),
        )
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return {"error": "Reserva no encontrada"}

        if row[0] != body.instructor_user_id:
            cur.close()
            conn.close()
            return {"error": "No puedes calificar esta reserva"}

        cur.execute(
            "SELECT id FROM ratings WHERE reservation_id = %s",
            (body.reservation_id,),
        )
        existing = cur.fetchone()

        if existing:
            cur.execute(
                """
                UPDATE ratings
                SET rating = %s, comment = %s
                WHERE reservation_id = %s
                """,
                (body.rating, body.comment, body.reservation_id),
            )
        else:
            cur.execute(
                """
                INSERT INTO ratings (reservation_id, rating, comment)
                VALUES (%s, %s, %s)
                """,
                (body.reservation_id, body.rating, body.comment),
            )

        conn.commit()
        cur.close()
        conn.close()
        return {"mensaje": "Calificación guardada"}

    except Exception as e:
        err = str(e).lower()
        if "column \"rating\"" in err or "rating" in err and "undefined" in err:
            return {
                "error": "Ajusta columnas en ratings (ver sql/ratings_expected.sql). Error: "
                + str(e),
            }
        return {"error": str(e)}
