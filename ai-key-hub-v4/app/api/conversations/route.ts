"DELETE FROM conversations WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
} else {
  await db.query(
    "DELETE FROM conversations WHERE user_id = $1",
    [userId]
  );
}

return NextResponse.json({ ok: true });

} catch (error) {
console.error("Delete conversation error", error);

return NextResponse.json(
  { error: "Не удалось удалить диалог." },
  { status: 500 }
);

}
}
