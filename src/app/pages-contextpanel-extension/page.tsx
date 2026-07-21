"use client";

import { useCurrentPage } from "@/src/utils/hooks/useCurrentPage";

export default function PagesContextPanel() {
  const { page, loading, error } = useCurrentPage();

  if (loading) {
    return (
      <main style={{ padding: "1.5rem" }}>
        <p>Loading current page...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: "1.5rem" }}>
        <p style={{ color: "red" }}>Failed to load page context.</p>
      </main>
    );
  }

  return (
    <main
      style={{
        padding: "1.5rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1>LinkWise</h1>
      <p>Internal Linking Assistant</p>

      <hr style={{ margin: "1.5rem 0" }} />

      <h2>Current Page</h2>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
        }}
      >
        <tbody>
          <tr>
            <td>
              <strong>Title</strong>
            </td>
            <td>{page?.displayName}</td>
          </tr>

          <tr>
            <td>
              <strong>Item ID</strong>
            </td>
            <td>{page?.id}</td>
          </tr>

          <tr>
            <td>
              <strong>Route</strong>
            </td>
            <td>{page?.route}</td>
          </tr>

          <tr>
            <td>
              <strong>Language</strong>
            </td>
            <td>{page?.language}</td>
          </tr>

          <tr>
            <td>
              <strong>Template</strong>
            </td>
            <td>{page?.template.name}</td>
          </tr>

          <tr>
            <td>
              <strong>Path</strong>
            </td>
            <td>{page?.path}</td>
          </tr>
        </tbody>
      </table>
    </main>
  );
}
