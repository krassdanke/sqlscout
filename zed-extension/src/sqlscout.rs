use zed_extension_api::{
    self as zed, Command, ContextServerId, LanguageServerId, Project, Result, Worktree,
};

struct SqlScout;

impl zed::Extension for SqlScout {
    fn new() -> Self {
        SqlScout
    }

    fn language_server_command(
        &mut self,
        language_server_id: &LanguageServerId,
        _worktree: &Worktree,
    ) -> Result<Command> {
        match language_server_id.as_ref() {
            "sqlscout-ls" => Ok(Command {
                command: "npx".into(),
                args: vec!["-y".into(), "@sqlscout/ls".into(), "--stdio".into()],
                env: Default::default(),
            }),
            other => Err(format!("Unknown SQLScout language server: {other}")),
        }
    }

    fn context_server_command(
        &mut self,
        context_server_id: &ContextServerId,
        _project: &Project,
    ) -> Result<Command> {
        match context_server_id.as_ref() {
            "sqlscout-mcp" => Ok(Command {
                command: "npx".into(),
                args: vec!["-y".into(), "@sqlscout/mcp".into()],
                env: Default::default(),
            }),
            other => Err(format!("Unknown SQLScout context server: {other}")),
        }
    }
}

zed::register_extension!(SqlScout);
