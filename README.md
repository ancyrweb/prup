# Prup
Prup is a small utility program that helps you deploy your code to your server in a single command.

### Motivation
Having to connect to a server using SSH and pasting commands to pull from a git repository and build a project is cumbersome.
Although tools helps you do that, they tend to be either heavy, hard to use or badly documented.

I wanted a small program to get the job done, have a very low memory footprint and could be easily configured / updated.
Hence Prup, initially "PRoject UPdater".

### How it works
Here's the general idea :
* You install `prup` on your server using NPM (`yarn global add` or `volta install` for example)
* You configure a `project`. A project simply is a location in your drive where your code lives. This is where the
commands are going to be executed.
* You start a TCP Server, on port 17997. This server will listen to clients and execute commands if asked to. You have to
start it manually.
As a way to protect your server, a unique key is generated that must be provided by clients in order to be allowed to execute commands.
* Back to your local machine, you install `prup` and add your server as a `remote`. A remote contains information about a server that accepts
`prup` requests. Informations are the IP Address, the port to which it listens to and the server secret key (without which you can't communicate with it).
* You create a `prup.config.js` file inside your code folder. It contains information about how `prup` should
build your project.
* You can build your project whenever you want by typing `prup build`

# Get Started
We will step by step walk through configure an hypothetical project.

### On your server
First install prup on your server :

`yarn global add prup`

Now, add a project. We'll name it `blog` and assume it lives at `/var/www/blog`.

`cd /var/www/blog && prup projects add blog`

You can ensure it has been correctly added by typing `prup projects list`.
Now that your project is created, you will see a list of commands to type in order to have it configured for your
particular setup.

Start the `prup` server :

`prup server start`

We are now done with the server part.
### On your local machine

Install prup globally :

`yarn global add prup`

Then add your server as a remote. We'll consider your server's IP address to be `1.2.3.4`, the key `2e6e43d48eb9` and we will
give it the name `myServer`.

`prup remotes add myServer 1.2.3.4 17997 2e6e43d48eb9`

You can ensure it has been correctly added by typing `prup remotes list`.

Now let's generate a `prup.config.js` file. Head into the code's directory.

`cd /var/www/blog`

And generate the file :

`prup projects create-config myServer blog`

It will contact the server, fetch informations about the project `blog` and create a `prup.config.js` file for you. It might look like this :

```
module.exports = {
  remoteAlias: "myServer",
  projectAlias: "blog",
  projectKey: "885a38cb7a127bf667c91273cb74cad764ebe2b77a",
  commands: [
    "git pull",
    "yarn run build",
    "php bin/console cache:clear",
  ]
};
```

Write your commands in the `commands` section.
When you are done, simply run :

`prup`

It will execute the commands on your server, in the directory configured for your project `blog`.

You are done. Whenever you want to update your server's just run `prup`.

### Security
1. You shouldn't commit your `prup.config.js` file into your repository as it will expose your server.
2. Keep the keys secrets. Your server key allows anyone to communicate with the `prup` server and execute commands, so keep it safe.
3. Also keep your project keys secret. Each project has a key you need to use in order to build the project. Therefore you always
need 2 keys to build a project.

I believe these are rudimentary security protections that will require more work to make prup even safer. PRs welcome !
In the meantime, you should **really** block communications to your port *17997* and whitelist your own machines. This port
shouldn't be accessible publicly until we figure out how to make it safe with minimal intervention.

### Next Steps
1. Whitelists / User Accounts : allow only specific machines to communicate with the server
2. Creating and configure projects remotely : without having to get into the server to add one.
3. Multiple commands set : so you can separate build, clear and other tasks in separate command groups.


### Helping
This project is still very prototypal and not ready for production use. Feedback and PRs are welcome !
