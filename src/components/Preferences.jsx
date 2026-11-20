import { initials } from "../utils/date";
import { PageIntro } from "./Shared";

export default function Preferences({ user }) {
    return (
        <>
            <PageIntro
                eyebrow="WORKSPACE SETTINGS"
                title="Your preferences"
                subtitle="Your POD profile and access details."
            />
            <section className="panel preferences-panel">
                <span
                    className="avatar avatar-large"
                    style={{ background: user.color || "#e3ebe5" }}
                >
                    {initials(user.name)}
                </span>
                <div>
                    <span className="panel-overline">PROFILE</span>
                    <h2>{user.name}</h2>
                    <p>{user.email}</p>
                    <p>
                        {user.role === "admin" ? "Administrator" : user.title}
                    </p>
                </div>
                <span className="preference-status">
                    <i /> Active
                </span>
            </section>
        </>
    );
}


