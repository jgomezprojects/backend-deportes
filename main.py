import os
from datetime import datetime
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


def _pick_existing_table(cursor, candidates: List[str]) -> Optional[str]:
    if not candidates:
        return None
    cursor.execute(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name = ANY(%s)
        ORDER BY array_position(%s::text[], table_name)
        LIMIT 1
        """,
        (candidates, candidates),
    )
    row = cursor.fetchone()
    return row[0] if row else None


def _resolve_notifications_mapping(cursor) -> Optional[dict]:
    table = _pick_existing_table(
        cursor,
        ["notifications", "notification", "notificaciones", "notificacion"],
    )
    if not table:
        return None
    return {
        "table": table,
        "user_id": _find_first_existing(
            cursor, table, ["user_id", "recipient_id", "usuario_id", "receiver_id"]
        ),
        "title": _find_first_existing(cursor, table, ["title", "subject", "titulo"]),
        "message": _find_first_existing(
            cursor, table, ["message", "body", "content", "mensaje", "text"]
        ),
        "type": _find_first_existing(cursor, table, ["type", "tipo", "category"]),
        "is_read": _find_first_existing(cursor, table, ["is_read", "read", "leido", "seen"]),
        "created_at": _find_first_existing(
            cursor, table, ["created_at", "created", "fecha", "timestamp"]
        ),
    }


def _resolve_enrollment_history_mapping(cursor) -> Optional[dict]:
    table = _pick_existing_table(
        cursor,
        [
            "enrollments_history",
            "enrollment_history",
            "enrollments",
            "enrollment",
            "enrollment_histories",
            "matricula_historial",
            "historial_matricula",
        ],
    )
    if not table:
        return None
    return {
        "table": table,
        "user_id": _find_first_existing(cursor, table, ["user_id", "student_id", "usuario_id"]),
        "schedule_id": _find_first_existing(cursor, table, ["schedule_id", "class_id", "horario_id"]),
        "sport_id": _find_first_existing(cursor, table, ["sport_id", "deporte_id"]),
        "reservation_id": _find_first_existing(
            cursor, table, ["reservation_id", "reserva_id", "booking_id"]
        ),
        "action": _find_first_existing(
            cursor,
            table,
            ["action", "event", "tipo_evento", "change_type", "tipo", "status", "estado"],
        ),
        "notes": _find_first_existing(cursor, table, ["notes", "note", "detalle", "description"]),
        "event_date": _find_first_existing(
            cursor, table, ["date", "event_date", "occurred_on", "dia"]
        ),
        "created_at": _find_first_existing(
            cursor, table, ["created_at", "created", "timestamp"]
        ),
    }


def _resolve_attendance_mapping(cursor) -> Optional[dict]:
    table = _pick_existing_table(
        cursor,
        ["attendance", "asistencias", "class_attendance", "student_attendance"],
    )
    if not table:
        return None
    return {
        "table": table,
        "reservation_id": _find_first_existing(
            cursor, table, ["reservation_id", "reserva_id", "booking_id"]
        ),
        "user_id": _find_first_existing(cursor, table, ["user_id", "student_id", "usuario_id"]),
        "schedule_id": _find_first_existing(cursor, table, ["schedule_id", "class_id", "horario_id"]),
        "status": _find_first_existing(
            cursor, table, ["status", "estado", "present", "asistio", "attendance_status"]
        ),
        "marked_by": _find_first_existing(
            cursor, table, ["marked_by", "instructor_id", "professor_id", "registrado_por"]
        ),
        "notes": _find_first_existing(cursor, table, ["notes", "note", "comentario", "observacion"]),
        "created_at": _find_first_existing(
            cursor, table, ["created_at", "created", "fecha", "timestamp"]
        ),
    }


def _insert_mapped_row(cursor, table: str, col_values: dict) -> None:
    cols = [c for c, v in col_values.items() if c is not None and v is not None]
    if not cols:
        raise Exception("No hay columnas para insertar")
    vals = [col_values[c] for c in cols]
    stmt = sql.SQL("INSERT INTO {tbl} ({fields}) VALUES ({placeholders})").format(
        tbl=sql.Identifier(table),
        fields=sql.SQL(", ").join(sql.Identifier(c) for c in cols),
        placeholders=sql.SQL(", ").join(sql.SQL("%s") for _ in cols),
    )
    cursor.execute(stmt, tuple(vals))


def _pg_column_type(cursor, table: str, column: str) -> Optional[tuple]:
    cursor.execute(
        """
        SELECT data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = %s
          AND column_name = %s
        """,
        (table, column),
    )
    row = cursor.fetchone()
    if not row:
        return None
    return (str(row[0]).lower(), str(row[1] or "").lower())


def _try_log_enrollment(
    cursor,
    *,
    user_id: int,
    schedule_id: int,
    reservation_id: Optional[int],
    action: str,
    notes: Optional[str] = None,
    sport_id: Optional[int] = None,
) -> None:
    mapping = _resolve_enrollment_history_mapping(cursor)
    if not mapping or not mapping["table"]:
        return
    act = (action or "").strip()
    if not act:
        return

    payload: dict = {}
    if mapping.get("action"):
        payload[mapping["action"]] = act
    elif mapping.get("notes"):
        payload[mapping["notes"]] = f"[{act}] {notes or ''}".strip()
    else:
        return

    if mapping.get("user_id"):
        payload[mapping["user_id"]] = user_id
    if mapping.get("schedule_id"):
        payload[mapping["schedule_id"]] = schedule_id
    if sport_id is not None and mapping.get("sport_id"):
        payload[mapping["sport_id"]] = sport_id
    if reservation_id is not None and mapping.get("reservation_id"):
        payload[mapping["reservation_id"]] = reservation_id
    if notes and mapping.get("notes") and mapping.get("action"):
        payload[mapping["notes"]] = notes
    if mapping.get("event_date"):
        ed = mapping["event_date"]
        info = _pg_column_type(cursor, mapping["table"], ed)
        if info and info[0] in ("timestamp without time zone", "timestamp with time zone"):
            payload[ed] = datetime.now()
        elif info and info[0] == "date":
            payload[ed] = datetime.now().date()
        else:
            payload[ed] = datetime.now().date()
    if mapping.get("created_at") and mapping["created_at"] not in payload:
        ca = mapping["created_at"]
        if ca != mapping.get("event_date"):
            info = _pg_column_type(cursor, mapping["table"], ca)
            if info and info[0] in ("timestamp without time zone", "timestamp with time zone"):
                payload[ca] = datetime.now()
            elif info and info[0] == "date":
                payload[ca] = datetime.now().date()
    _insert_mapped_row(cursor, mapping["table"], payload)


def _try_create_notification(
    cursor,
    *,
    user_id: int,
    title: str,
    message: str,
    notif_type: Optional[str] = None,
) -> None:
    mapping = _resolve_notifications_mapping(cursor)
    if not mapping or not mapping["table"]:
        return
    if not mapping.get("user_id") or not (mapping.get("title") or mapping.get("message")):
        return
    payload: dict = {}
    payload[mapping["user_id"]] = user_id
    if mapping.get("title"):
        payload[mapping["title"]] = title
    if mapping.get("message"):
        payload[mapping["message"]] = message
    if notif_type and mapping.get("type"):
        payload[mapping["type"]] = notif_type
    if mapping.get("is_read") is not None:
        payload[mapping["is_read"]] = False
    _insert_mapped_row(cursor, mapping["table"], payload)


def _try_log_attendance_row(
    cursor,
    *,
    reservation_id: int,
    student_user_id: int,
    schedule_id: int,
    status: str,
    instructor_user_id: Optional[int] = None,
    notes: Optional[str] = None,
) -> None:
    mapping = _resolve_attendance_mapping(cursor)
    if not mapping or not mapping["table"]:
        return
    if not mapping.get("reservation_id") and not mapping.get("user_id"):
        return
    if not mapping.get("status"):
        return
    payload: dict = {}
    if mapping.get("reservation_id"):
        payload[mapping["reservation_id"]] = reservation_id
    if mapping.get("user_id"):
        payload[mapping["user_id"]] = student_user_id
    if mapping.get("schedule_id"):
        payload[mapping["schedule_id"]] = schedule_id
    payload[mapping["status"]] = status
    if instructor_user_id is not None and mapping.get("marked_by"):
        payload[mapping["marked_by"]] = instructor_user_id
    if notes and mapping.get("notes"):
        payload[mapping["notes"]] = notes
    _insert_mapped_row(cursor, mapping["table"], payload)


def _coerce_attendance_status_for_db(
    cursor, table: str, status_column: str, logical: str
) -> Any:
    """logical: PRESENT | ABSENT (mayúsculas)."""
    logical = (logical or "").strip().upper()
    if logical not in ("PRESENT", "ABSENT"):
        logical = "ABSENT"
    info = _pg_column_type(cursor, table, status_column)
    if not info:
        return "PRESENT" if logical == "PRESENT" else "ABSENT"
    data_type, udt_name = info
    if data_type == "boolean" or udt_name == "bool":
        return logical == "PRESENT"
    if data_type in ("smallint", "integer", "bigint"):
        return 1 if logical == "PRESENT" else 0
    return "PRESENT" if logical == "PRESENT" else "ABSENT"


def _normalize_attendance_status_display(raw: Any) -> Optional[str]:
    if raw is None:
        return None
    if isinstance(raw, bool):
        return "PRESENT" if raw else "ABSENT"
    if isinstance(raw, (int, float)):
        return "PRESENT" if raw else "ABSENT"
    s = str(raw).strip().upper()
    if s in ("PRESENT", "ABSENT", "1", "0", "T", "F", "TRUE", "FALSE"):
        if s in ("PRESENT", "1", "T", "TRUE"):
            return "PRESENT"
        if s in ("ABSENT", "0", "F", "FALSE"):
            return "ABSENT"
    return s or None


def upsert_attendance_for_reservation(
    cursor,
    *,
    reservation_id: int,
    student_user_id: int,
    schedule_id: int,
    logical_status: str,
    instructor_user_id: int,
    notes: Optional[str] = None,
) -> None:
    """
    Inserta o actualiza una fila de asistencia (presente/ausente) para una reserva.
    """
    mapping = _resolve_attendance_mapping(cursor)
    if not mapping or not mapping["table"]:
        raise Exception(
            "No se encontró tabla attendance (attendance/asistencias/…). "
            "Crea la tabla en Neon (ver sql/attendance.sql)."
        )
    if not mapping.get("status"):
        raise Exception(
            "La tabla de asistencia necesita columna status, estado, present, asistio o attendance_status."
        )
    if not mapping.get("reservation_id") and not (
        mapping.get("user_id") and mapping.get("schedule_id")
    ):
        raise Exception(
            "La tabla de asistencia necesita reservation_id (o reserva_id) "
            "o bien el par user_id + schedule_id para enlazar la reserva."
        )

    tbl = mapping["table"]
    st_col = mapping["status"]
    db_val = _coerce_attendance_status_for_db(cursor, tbl, st_col, logical_status)

    set_fragments: List[Any] = [
        sql.SQL("{} = %s").format(sql.Identifier(st_col)),
    ]
    params: List[Any] = [db_val]
    if mapping.get("marked_by"):
        set_fragments.append(sql.SQL("{} = %s").format(sql.Identifier(mapping["marked_by"])))
        params.append(instructor_user_id)
    if notes is not None and mapping.get("notes"):
        set_fragments.append(sql.SQL("{} = %s").format(sql.Identifier(mapping["notes"])))
        params.append(notes)

    if mapping.get("reservation_id"):
        res_c = mapping["reservation_id"]
        where_sql = sql.SQL("WHERE {} = %s").format(sql.Identifier(res_c))
        params.append(reservation_id)
    else:
        u_c, s_c = mapping["user_id"], mapping["schedule_id"]
        where_sql = sql.SQL("WHERE {} = %s AND {} = %s").format(
            sql.Identifier(u_c),
            sql.Identifier(s_c),
        )
        params.extend([student_user_id, schedule_id])

    upd = sql.SQL("UPDATE {tbl} SET {sets} {where}").format(
        tbl=sql.Identifier(tbl),
        sets=sql.SQL(", ").join(set_fragments),
        where=where_sql,
    )
    cursor.execute(upd, tuple(params))
    if cursor.rowcount and cursor.rowcount > 0:
        return

    insert_payload: dict = {}
    if mapping.get("reservation_id"):
        insert_payload[mapping["reservation_id"]] = reservation_id
    if mapping.get("user_id"):
        insert_payload[mapping["user_id"]] = student_user_id
    if mapping.get("schedule_id"):
        insert_payload[mapping["schedule_id"]] = schedule_id
    insert_payload[st_col] = db_val
    if mapping.get("marked_by"):
        insert_payload[mapping["marked_by"]] = instructor_user_id
    if notes is not None and mapping.get("notes"):
        insert_payload[mapping["notes"]] = notes
    _insert_mapped_row(cursor, tbl, insert_payload)


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


@app.delete("/usuarios/{user_id}")
def delete_usuario(user_id: int):
    """Elimina usuario y datos relacionados para dejar la BD consistente."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        users = _resolve_users_mapping(conn)

        # Limpiar dependencias directas/indirectas sin depender de cascadas.
        cur.execute("DELETE FROM students WHERE user_id = %s", (user_id,))
        cur.execute(
            """
            DELETE FROM ratings
            WHERE reservation_id IN (
                SELECT id FROM reservations WHERE user_id = %s
            )
            """,
            (user_id,),
        )
        cur.execute("DELETE FROM reservations WHERE user_id = %s", (user_id,))
        cur.execute(
            "UPDATE schedules SET instructor_id = NULL WHERE instructor_id = %s",
            (user_id,),
        )
        cur.execute(
            sql.SQL("DELETE FROM {users_table} WHERE {id_col} = %s").format(
                users_table=sql.Identifier(users["table"]),
                id_col=sql.Identifier(users["id"]),
            ),
            (user_id,),
        )
        if cur.rowcount == 0:
            cur.close()
            conn.close()
            return {"error": "Usuario no encontrado"}

        conn.commit()
        cur.close()
        conn.close()
        return {"mensaje": "Usuario eliminado"}
    except Exception as e:
        return {"error": str(e)}


@app.delete("/users/{user_id}")
def delete_user_alias(user_id: int):
    return delete_usuario(user_id)


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


def _parse_hour_range(hour_value: str) -> Optional[tuple]:
    """Acepta 'HH:MM-HH:MM' y devuelve minutos inicio/fin."""
    if not hour_value or "-" not in hour_value:
        return None
    raw_start, raw_end = hour_value.split("-", 1)
    start_txt = raw_start.strip()
    end_txt = raw_end.strip()
    try:
        start_dt = datetime.strptime(start_txt, "%H:%M")
        end_dt = datetime.strptime(end_txt, "%H:%M")
    except ValueError:
        return None
    start_min = start_dt.hour * 60 + start_dt.minute
    end_min = end_dt.hour * 60 + end_dt.minute
    if end_min <= start_min:
        return None
    return start_min, end_min


def _format_hour_range(hour_value: str) -> Optional[str]:
    parsed = _parse_hour_range(hour_value)
    if not parsed:
        return None
    start_min, end_min = parsed
    start_txt = f"{start_min // 60:02d}:{start_min % 60:02d}"
    end_txt = f"{end_min // 60:02d}:{end_min % 60:02d}"
    return f"{start_txt}-{end_txt}"


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
        normalized_hour = _format_hour_range(body.hour)
        if not normalized_hour:
            return {
                "error": "Formato de hora inválido. Usa rango HH:MM-HH:MM, por ejemplo 18:00-19:30.",
            }
        new_start_min, new_end_min = _parse_hour_range(normalized_hour)

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
            SELECT id, hour
            FROM schedules
            WHERE location_id = %s
              AND LOWER(TRIM(day)) = LOWER(TRIM(%s))
            """,
            (body.location_id, body.day.strip()),
        )
        existing_rows = cur.fetchall()
        for row in existing_rows:
            existing_hour = row[1]
            existing_range = _parse_hour_range(existing_hour) if existing_hour else None
            if not existing_range:
                continue
            existing_start_min, existing_end_min = existing_range
            has_overlap = (
                new_start_min < existing_end_min and new_end_min > existing_start_min
            )
            if has_overlap:
                cur.close()
                conn.close()
                return {
                    "error": "Ya existe un horario en ese lugar y día que se cruza con el rango indicado.",
                }

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
                normalized_hour,
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


@app.delete("/schedules/{schedule_id}")
def delete_schedule(schedule_id: int):
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            "DELETE FROM ratings WHERE reservation_id IN (SELECT id FROM reservations WHERE schedule_id = %s)",
            (schedule_id,),
        )
        cur.execute("DELETE FROM reservations WHERE schedule_id = %s", (schedule_id,))
        cur.execute("DELETE FROM schedules WHERE id = %s", (schedule_id,))
        if cur.rowcount == 0:
            cur.close()
            conn.close()
            return {"error": "Horario no encontrado"}

        conn.commit()
        cur.close()
        conn.close()
        return {"mensaje": "Horario eliminado"}
    except Exception as e:
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
            "INSERT INTO reservations (user_id, schedule_id) VALUES (%s, %s) RETURNING id",
            (reserva.user_id, reserva.schedule_id),
        )
        new_reservation_id = cursor.fetchone()[0]

        cursor.execute(
            "SELECT sport_id FROM schedules WHERE id = %s",
            (reserva.schedule_id,),
        )
        sport_row = cursor.fetchone()
        sport_oid = sport_row[0] if sport_row else None

        try:
            _try_log_enrollment(
                cursor,
                user_id=reserva.user_id,
                schedule_id=reserva.schedule_id,
                reservation_id=new_reservation_id,
                action="ENROLLED",
                notes="Inscripción creada desde API",
                sport_id=sport_oid,
            )
            _try_create_notification(
                cursor,
                user_id=reserva.user_id,
                title="Inscripción confirmada",
                message=f"Te inscribiste al horario ID {reserva.schedule_id}.",
                notif_type="RESERVATION",
            )
        except Exception:
            pass

        conn.commit()
        cursor.close()
        conn.close()

        return {"mensaje": "Inscripción exitosa", "reservation_id": new_reservation_id}

    except Exception as e:
        return {"error": str(e)}


@app.delete("/reservas/{reserva_id}")
def delete_reserva(reserva_id: int):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT r.user_id, r.schedule_id, s.sport_id
            FROM reservations r
            JOIN schedules s ON r.schedule_id = s.id
            WHERE r.id = %s
            """,
            (reserva_id,),
        )
        res_row = cur.fetchone()
        if not res_row:
            cur.close()
            conn.close()
            return {"error": "Reserva no encontrada"}

        student_uid, sched_id, sport_oid = res_row[0], res_row[1], res_row[2]
        try:
            _try_log_enrollment(
                cur,
                user_id=student_uid,
                schedule_id=sched_id,
                reservation_id=reserva_id,
                action="UNENROLLED",
                notes="Reserva eliminada",
                sport_id=sport_oid,
            )
        except Exception:
            pass

        att = _resolve_attendance_mapping(cur)
        if att and att.get("table") and att.get("reservation_id"):
            cur.execute(
                sql.SQL("DELETE FROM {tbl} WHERE {rc} = %s").format(
                    tbl=sql.Identifier(att["table"]),
                    rc=sql.Identifier(att["reservation_id"]),
                ),
                (reserva_id,),
            )
        cur.execute("DELETE FROM ratings WHERE reservation_id = %s", (reserva_id,))
        cur.execute("DELETE FROM reservations WHERE id = %s", (reserva_id,))

        conn.commit()
        cur.close()
        conn.close()
        return {"mensaje": "Reserva eliminada"}
    except Exception as e:
        return {"error": str(e)}


@app.get("/enrollment-history")
def listar_historial_matricula(
    user_id: Optional[int] = None,
    instructor_id: Optional[int] = None,
    schedule_id: Optional[int] = None,
    limit: int = 200,
) -> Any:
    """Historial de matrícula (tabla enrollments_history / enrollment_history / …)."""
    lim = max(1, min(limit, 500))
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        mcur = conn.cursor()
        mapping = _resolve_enrollment_history_mapping(mcur)
        if not mapping:
            mcur.close()
            cur.close()
            conn.close()
            return []

        tbl = mapping["table"]
        users = _resolve_users_mapping(conn)
        display_col = users["nombre"] or users["email"]
        uid_col = mapping.get("user_id")
        sch_col = mapping.get("schedule_id")
        res_col = mapping.get("reservation_id")
        sport_col = mapping.get("sport_id")

        joins: List[Any] = []
        wheres: List[Any] = []
        params: List[Any] = []

        if sport_col:
            joins.append(
                sql.SQL("LEFT JOIN sports sp ON sp.id = eh.{sc}").format(
                    sc=sql.Identifier(sport_col)
                )
            )
        if uid_col:
            joins.append(
                sql.SQL("LEFT JOIN {ut} u ON u.{uid} = eh.{euid}").format(
                    ut=sql.Identifier(users["table"]),
                    uid=sql.Identifier(users["id"]),
                    euid=sql.Identifier(uid_col),
                )
            )

        if user_id is not None and uid_col:
            wheres.append(sql.SQL("eh.{c} = %s").format(c=sql.Identifier(uid_col)))
            params.append(user_id)

        if schedule_id is not None and sch_col:
            wheres.append(sql.SQL("eh.{c} = %s").format(c=sql.Identifier(sch_col)))
            params.append(schedule_id)

        if instructor_id is not None:
            if res_col:
                joins.append(
                    sql.SQL(
                        "LEFT JOIN reservations r_ins ON r_ins.id = eh.{rc} "
                        "LEFT JOIN schedules s_ins ON s_ins.id = r_ins.schedule_id"
                    ).format(rc=sql.Identifier(res_col))
                )
                wheres.append(sql.SQL("s_ins.instructor_id = %s"))
                params.append(instructor_id)
            elif sch_col:
                joins.append(
                    sql.SQL("LEFT JOIN schedules s_ins ON s_ins.id = eh.{sch}").format(
                        sch=sql.Identifier(sch_col)
                    )
                )
                wheres.append(sql.SQL("s_ins.instructor_id = %s"))
                params.append(instructor_id)
            else:
                mcur.close()
                cur.close()
                conn.close()
                return {
                    "error": "No se puede filtrar por instructor_id: la tabla no tiene "
                    "reservation_id ni schedule_id.",
                }

        order_col = _find_first_existing(mcur, tbl, ["id", "date", "created_at", "created", "timestamp"])
        mcur.close()

        sel_extra = sql.SQL(", sp.name AS sport_name") if sport_col else sql.SQL("")
        student_lbl = (
            sql.SQL(", u.{dc} AS student_label").format(dc=sql.Identifier(display_col))
            if uid_col
            else sql.SQL("")
        )
        join_sql = sql.SQL(" ").join(joins) if joins else sql.SQL("")
        where_sql = (
            sql.SQL("WHERE ") + sql.SQL(" AND ").join(wheres)
            if wheres
            else sql.SQL("")
        )
        oc = sql.Identifier(order_col) if order_col else sql.Identifier("id")

        stmt = sql.SQL(
            "SELECT eh.* {sport_nm} {stu} FROM {eh} AS eh {j} {w} ORDER BY eh.{oc} DESC NULLS LAST LIMIT %s"
        ).format(
            sport_nm=sel_extra,
            stu=student_lbl,
            eh=sql.Identifier(tbl),
            j=join_sql,
            w=where_sql,
            oc=oc,
        )
        params.append(lim)
        cur.execute(stmt, tuple(params))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        return {"error": str(e)}


def _attach_attendance_to_reservation_rows(
    cursor,
    rows: List[dict],
    mapping: Optional[dict],
) -> None:
    """Añade clave attendance_status (PRESENT|ABSENT|None) a cada fila dict."""
    if not rows:
        return
    if not mapping or not mapping.get("table") or not mapping.get("status"):
        for r in rows:
            r["attendance_status"] = None
        return

    tbl = mapping["table"]
    scol = mapping["status"]

    if mapping.get("reservation_id"):
        rcol = mapping["reservation_id"]
        ids = [r["reservation_id"] for r in rows if r.get("reservation_id") is not None]
        if not ids:
            for r in rows:
                r["attendance_status"] = None
            return
        id_col = _find_first_existing(cursor, tbl, ["id"])
        if id_col:
            stmt = sql.SQL(
                "SELECT {rc}, {sc}, {ic} FROM {tbl} WHERE {rc} IN ({ph})"
            ).format(
                rc=sql.Identifier(rcol),
                sc=sql.Identifier(scol),
                ic=sql.Identifier(id_col),
                tbl=sql.Identifier(tbl),
                ph=sql.SQL(", ").join(sql.SQL("%s") for _ in ids),
            )
        else:
            stmt = sql.SQL("SELECT {rc}, {sc} FROM {tbl} WHERE {rc} IN ({ph})").format(
                rc=sql.Identifier(rcol),
                sc=sql.Identifier(scol),
                tbl=sql.Identifier(tbl),
                ph=sql.SQL(", ").join(sql.SQL("%s") for _ in ids),
            )
        cursor.execute(stmt, tuple(ids))
        fetched = cursor.fetchall()
        status_by_rid: dict = {}
        if id_col:
            best: dict = {}
            for tup in fetched:
                rid, st, iid = tup[0], tup[1], tup[2]
                if rid not in best:
                    best[rid] = (st, iid)
                else:
                    _old_st, old_iid = best[rid]
                    if iid is not None and (old_iid is None or iid > old_iid):
                        best[rid] = (st, iid)
            for rid, pair in best.items():
                status_by_rid[rid] = pair[0]
        else:
            for tup in fetched:
                rid, st = tup[0], tup[1]
                status_by_rid[rid] = st
        for r in rows:
            raw = status_by_rid.get(r.get("reservation_id"))
            r["attendance_status"] = _normalize_attendance_status_display(raw)
        return

    if mapping.get("user_id") and mapping.get("schedule_id"):
        uc, schc = mapping["user_id"], mapping["schedule_id"]
        sids = list({r["schedule_id"] for r in rows if r.get("schedule_id") is not None})
        if not sids:
            for r in rows:
                r["attendance_status"] = None
            return
        id_col = _find_first_existing(cursor, tbl, ["id"])
        if id_col:
            stmt = sql.SQL(
                "SELECT {u}, {sch}, {sc}, {ic} FROM {tbl} WHERE {sch} IN ({ph})"
            ).format(
                u=sql.Identifier(uc),
                sch=sql.Identifier(schc),
                sc=sql.Identifier(scol),
                ic=sql.Identifier(id_col),
                tbl=sql.Identifier(tbl),
                ph=sql.SQL(", ").join(sql.SQL("%s") for _ in sids),
            )
        else:
            stmt = sql.SQL(
                "SELECT {u}, {sch}, {sc} FROM {tbl} WHERE {sch} IN ({ph})"
            ).format(
                u=sql.Identifier(uc),
                sch=sql.Identifier(schc),
                sc=sql.Identifier(scol),
                tbl=sql.Identifier(tbl),
                ph=sql.SQL(", ").join(sql.SQL("%s") for _ in sids),
            )
        cursor.execute(stmt, tuple(sids))
        fetched = cursor.fetchall()
        status_by_pair: dict = {}
        if id_col:
            bestp: dict = {}
            for tup in fetched:
                u_i, s_i, st, iid = tup[0], tup[1], tup[2], tup[3]
                key = (u_i, s_i)
                if key not in bestp:
                    bestp[key] = (st, iid)
                else:
                    _old_st, old_iid = bestp[key]
                    if iid is not None and (old_iid is None or iid > old_iid):
                        bestp[key] = (st, iid)
            for key, pair in bestp.items():
                status_by_pair[key] = pair[0]
        else:
            for tup in fetched:
                key = (tup[0], tup[1])
                status_by_pair[key] = tup[2]
        for r in rows:
            key = (r.get("user_id"), r.get("schedule_id"))
            raw = status_by_pair.get(key)
            r["attendance_status"] = _normalize_attendance_status_display(raw)
        return

    for r in rows:
        r["attendance_status"] = None


class MarcarAsistenciaBody(BaseModel):
    reservation_id: int
    instructor_user_id: int
    status: str
    notes: Optional[str] = None


@app.get("/attendance")
def listar_asistencia_profesor(instructor_id: int) -> Any:
    """Lista inscripciones del profesor con última asistencia registrada (PRESENT/ABSENT)."""
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        users = _resolve_users_mapping(conn)
        display_col = users["nombre"] or users["email"]

        cur.execute(
            sql.SQL(
                """
                SELECT
                    r.id AS reservation_id,
                    r.user_id,
                    r.schedule_id,
                    u.{display_col} AS estudiante_nombre,
                    sp.name AS deporte,
                    s.day,
                    s.hour
                FROM reservations r
                JOIN {users_table} u ON r.user_id = u.{id_col}
                JOIN schedules s ON r.schedule_id = s.id
                JOIN sports sp ON s.sport_id = sp.id
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
        rows_raw = cur.fetchall()
        rows = [dict(r) for r in rows_raw]
        mcur = conn.cursor()
        mapping = _resolve_attendance_mapping(mcur)
        _attach_attendance_to_reservation_rows(mcur, rows, mapping)
        mcur.close()
        cur.close()
        conn.close()
        return rows
    except Exception as e:
        err = str(e).lower()
        if "instructor_id" in err:
            return {
                "error": "Falta schedules.instructor_id o JOIN. Revisa sql/schedules_instructor.sql.",
            }
        return {"error": str(e)}


@app.post("/attendance")
def marcar_asistencia(body: MarcarAsistenciaBody) -> Any:
    """Profesor: marca presente o ausente para una reserva (tabla attendance)."""
    logical = (body.status or "").strip().upper()
    if logical not in ("PRESENT", "ABSENT"):
        return {"error": 'status debe ser "PRESENT" o "ABSENT"'}

    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT r.user_id, r.schedule_id, s.instructor_id
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

        student_user_id, schedule_id, schedule_instructor_id = row[0], row[1], row[2]
        if schedule_instructor_id != body.instructor_user_id:
            cur.close()
            conn.close()
            return {"error": "No puedes modificar asistencia de esta reserva"}

        upsert_attendance_for_reservation(
            cur,
            reservation_id=body.reservation_id,
            student_user_id=student_user_id,
            schedule_id=schedule_id,
            logical_status=logical,
            instructor_user_id=body.instructor_user_id,
            notes=body.notes,
        )
        conn.commit()
        cur.close()
        conn.close()
        return {"mensaje": "Asistencia guardada", "status": logical}
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
            SELECT r.user_id, r.schedule_id, s.instructor_id, s.sport_id
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

        student_user_id, schedule_id, schedule_instructor_id, sport_id = (
            row[0],
            row[1],
            row[2],
            row[3],
        )

        if schedule_instructor_id != body.instructor_user_id:
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
                SET rating = %s, comment = %s, user_id = %s, sport_id = %s
                WHERE reservation_id = %s
                """,
                (body.rating, body.comment, student_user_id, sport_id, body.reservation_id),
            )
        else:
            cur.execute(
                """
                INSERT INTO ratings (reservation_id, user_id, sport_id, rating, comment)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (body.reservation_id, student_user_id, sport_id, body.rating, body.comment),
            )

        try:
            _try_log_enrollment(
                cur,
                user_id=student_user_id,
                schedule_id=schedule_id,
                reservation_id=body.reservation_id,
                action="GRADED",
                notes=f"Nota {body.rating}",
                sport_id=sport_id,
            )
            _try_create_notification(
                cur,
                user_id=student_user_id,
                title="Nueva calificación",
                message=f"Tu nota fue registrada: {body.rating}",
                notif_type="GRADE",
            )
        except Exception:
            pass

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

if __name__ == "__main__":
    import uvicorn
    import os

    port = int(os.environ.get("PORT", 8000))

    uvicorn.run("main:app", host="0.0.0.0", port=port)